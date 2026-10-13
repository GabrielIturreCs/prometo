/**
 * Passkey accounts with Mera (Category Labs). The passkey's PRF output deterministically
 * derives a standard BIP-44 EVM account, so the same Face ID / fingerprint reproduces the same
 * account on every device the passkey syncs to. No seed phrase, no extension, no custody.
 */
import { createPasskeyWithPrfOutput, getPasskeyPrfOutput, createSecp256k1SigningSession, type PasskeyCredentialMetadata, type Secp256k1SigningSession } from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { HDKey } from "@scure/bip32";
import { createWalletClient, http, type LocalAccount, type WalletClient, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { chain, RPC_URL, IS_MAINNET } from "./chain";

const RP = { id: location.hostname, name: "Prometo" };
const STORAGE = "prometo.passkey"; // only credential metadata: contains no key material

export type Session = {
  account: LocalAccount;
  wallet: WalletClient;
  mnemonic: string; // shown only in "Exportar cuenta"
  end: () => void;
};

export function savedCredential(): PasskeyCredentialMetadata | null {
  try { const s = localStorage.getItem(STORAGE); return s ? JSON.parse(s) : null; } catch { return null; }
}
export function forgetCredential() { try { localStorage.removeItem(STORAGE); } catch { /* noop */ } }

function sessionFromPrf(prfOutput: Uint8Array): Session {
  const mnemonic = entropyToMnemonic(prfOutput, wordlist);
  const seed = mnemonicToSeedSync(mnemonic);
  const key = HDKey.fromMasterSeed(seed).derive("m/44'/60'/0'/0/0");
  if (!key.privateKey) throw new Error("derivation failed");
  const session: Secp256k1SigningSession = createSecp256k1SigningSession({ privateKey: key.privateKey });
  const account = toViemAccount(session);
  const wallet = createWalletClient({ account, chain, transport: http(RPC_URL) });
  return { account, wallet, mnemonic, end: () => session.end() };
}

/** First time: create a passkey and derive the account. */
export async function signUp(displayName: string): Promise<Session> {
  const res = await createPasskeyWithPrfOutput({
    rp: RP,
    user: { name: displayName.toLowerCase().replace(/\s+/g, "-") || "prometo", displayName: displayName || "Prometo" },
  });
  const meta: PasskeyCredentialMetadata = { credentialId: res.credentialId, transports: res.transports };
  localStorage.setItem(STORAGE, JSON.stringify(meta));
  return sessionFromPrf(res.prfOutput);
}

/** Returning user (or new device): the authenticator shows saved passkeys. */
export async function signIn(): Promise<Session> {
  const credential = savedCredential() ?? undefined;
  const res = await getPasskeyPrfOutput({ rpId: RP.id, credential });
  localStorage.setItem(STORAGE, JSON.stringify({ credentialId: res.credentialId, transports: credential?.transports }));
  return sessionFromPrf(res.prfOutput);
}

export function explainMeraError(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code === "PRF_UNAVAILABLE") return "Tu navegador no soporta passkeys con PRF. En Chrome de PC, guardá la passkey en Google Password Manager; en el celular funciona directo.";
  if (code === "PASSKEY_OPERATION_FAILED") return "Se canceló la huella / Face ID.";
  return (e as Error)?.message || "Algo salió mal";
}

/**
 * Test mode (testnet only): for judges on desktop browsers without PRF passkeys. A throwaway key
 * kept in this browser. Never available on mainnet.
 */
const TEST_KEY = "prometo.testkey";
export const testModeAvailable = !IS_MAINNET;
export function signInTestMode(): Session {
  if (IS_MAINNET) throw new Error("Test mode is disabled on mainnet");
  let k = localStorage.getItem(TEST_KEY) as Hex | null;
  if (!k) { k = generatePrivateKey(); localStorage.setItem(TEST_KEY, k); }
  const account = privateKeyToAccount(k);
  const wallet = createWalletClient({ account, chain, transport: http(RPC_URL) });
  return { account, wallet, mnemonic: "Modo prueba: esta cuenta vive solo en este navegador.", end: () => {} };
}

/* ---------------------------------------------------------------- protect an existing key */
import { createSecretVaultWithNewPasskey, decryptSecretVaultWithPasskey, parseSecretVault } from "@category-labs/mera";
import { hexToBytes, bytesToHex } from "viem";

/**
 * "Activar huella" for accounts created in test mode: the existing private key is encrypted into
 * a Mera secret vault with a key derived from the passkey's PRF output (a non-wallet use of the
 * PRF key material). Afterwards the account opens with Face ID / fingerprint on this device.
 */
const VAULT_KEY = "prometo.vault";
export const isTestModeSession = () => { try { return !!localStorage.getItem(TEST_KEY); } catch { return false; } };
export const hasVault = () => { try { return !!localStorage.getItem(VAULT_KEY); } catch { return false; } };

export async function protectTestAccountWithPasskey(displayName: string) {
  const k = localStorage.getItem(TEST_KEY) as Hex | null;
  if (!k) throw new Error("No hay cuenta de prueba para proteger");
  const vault = await createSecretVaultWithNewPasskey({
    rp: RP,
    user: { name: displayName.toLowerCase().replace(/\s+/g, "-") || "prometo", displayName: displayName || "Prometo" },
    secret: hexToBytes(k),
  });
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  localStorage.removeItem(TEST_KEY); // the key now only exists encrypted under the passkey
}

export async function signInWithVault(): Promise<Session> {
  const vault = parseSecretVault(JSON.parse(localStorage.getItem(VAULT_KEY) || "null"));
  const secret = await decryptSecretVaultWithPasskey({ rpId: RP.id, vault });
  const account = privateKeyToAccount(bytesToHex(secret));
  secret.fill(0);
  const wallet = createWalletClient({ account, chain, transport: http(RPC_URL) });
  return { account, wallet, mnemonic: "Cuenta protegida con tu huella en este dispositivo.", end: () => {} };
}
