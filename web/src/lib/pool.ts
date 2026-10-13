import { keccak256, toHex, type Address, type Hex } from "viem";
import { PromisePoolAbi } from "../abi/PromisePool";
import { MockAUSDAbi } from "../abi/MockAUSD";
import { publicClient, POOL_ADDRESS, TOKEN_ADDRESS, API_URL, chain, IS_MAINNET } from "./chain";
import type { Session } from "./mera";

export type Mode = 0 | 1; // 0 PROMISE, 1 MATCH
export type Pool = {
  id: bigint; host: Address; token: Address; stake: bigint; joinUntil: number; endsAt: number;
  feeBps: number; mode: Mode; status: number; required: number; participants: number;
  metaHash: Hex; verifier: Address; reportedWinner: number; reportsMask: number; firstReportAt: number;
};
export type Member = { joined: boolean; side: number; checkins: number; rejected: number };
export type Meta = { title: string; emoji?: string; rule?: string; sideA?: string; sideB?: string };

const META_KEY = "prometo.meta"; // offchain metadata keyed by metaHash (MVP: localStorage + share link)

export function metaHashOf(meta: Meta): Hex { return keccak256(toHex(JSON.stringify(meta))); }
export function saveMeta(meta: Meta) {
  const all = loadAllMeta(); all[metaHashOf(meta)] = meta;
  try { localStorage.setItem(META_KEY, JSON.stringify(all)); } catch { /* storage full or blocked */ }
}
/** Publish metadata to the API (content-addressed by the same hash the contract stores). */
export async function publishMeta(meta: Meta) {
  const raw = JSON.stringify(meta);
  await fetch(`${API_URL}/meta/${metaHashOf(meta)}`, { method: "PUT", body: raw }).catch(() => {});
}
/** Fetch metadata from cache, else from the API. */
export async function fetchMeta(hash: Hex): Promise<Meta | undefined> {
  const cached = metaFor(hash);
  if (cached) return cached;
  try {
    const res = await fetch(`${API_URL}/meta/${hash}`);
    if (!res.ok) return undefined;
    const meta = (await res.json()) as Meta;
    if (metaHashOf(meta) === hash) { saveMeta(meta); return meta; }
  } catch { /* offline */ }
  return undefined;
}

/* ---------------------------------------------------------------- names */
const NAMES_KEY = "prometo.names";
let nameCache: Record<string, string> = (() => { try { return JSON.parse(localStorage.getItem(NAMES_KEY) || "{}"); } catch { return {}; } })();
export function cachedName(a: string) { return nameCache[a.toLowerCase()]; }
export async function fetchNames(addrs: readonly string[]) {
  const missing = addrs.filter((a) => !nameCache[a.toLowerCase()]);
  if (missing.length) {
    try {
      const res = await fetch(`${API_URL}/names?a=${missing.join(",")}`);
      nameCache = { ...nameCache, ...(await res.json()) };
      localStorage.setItem(NAMES_KEY, JSON.stringify(nameCache));
    } catch { /* offline */ }
  }
  return nameCache;
}
export async function setMyName(s: Session, name: string) {
  const clean = name.trim().slice(0, 32);
  const signature = await s.account.signMessage!({ message: `Prometo: mi nombre es ${clean}` });
  await fetch(`${API_URL}/profile`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: s.account.address, name: clean, signature }) });
  nameCache[s.account.address.toLowerCase()] = clean;
  try { localStorage.setItem(NAMES_KEY, JSON.stringify(nameCache)); } catch { /* noop */ }
}
/** Friendly fallback when someone hasn't set a name: never show 0x addresses. */
const ANIMALS = ["Puma", "Cóndor", "Llama", "Yaguareté", "Zorro", "Carpincho", "Tucán", "Vicuña", "Ñandú", "Hornero", "Pingüino", "Guanaco"];
export function displayName(a: string, me?: string) {
  if (me && a.toLowerCase() === me.toLowerCase()) return "Vos";
  const n = cachedName(a);
  if (n) return n;
  const i = parseInt(a.slice(2, 6), 16);
  return `${ANIMALS[i % ANIMALS.length]} ${(i % 90) + 10}`;
}
export function loadAllMeta(): Record<string, Meta> {
  try { return JSON.parse(localStorage.getItem(META_KEY) || "{}"); } catch { return {}; }
}
export function metaFor(hash: Hex): Meta | undefined { return loadAllMeta()[hash]; }

export async function readPool(id: bigint): Promise<Pool> {
  const p = await publicClient.readContract({ address: POOL_ADDRESS, abi: PromisePoolAbi, functionName: "pools", args: [id] });
  return {
    id, host: p[0], token: p[1], stake: p[2], joinUntil: Number(p[3]), endsAt: Number(p[4]), feeBps: p[5],
    mode: p[6] as Mode, status: p[7], required: p[8], participants: p[9], metaHash: p[10], verifier: p[11],
    reportedWinner: p[12], reportsMask: p[13], firstReportAt: Number(p[14]),
  };
}
export async function readMember(id: bigint, who: Address): Promise<Member> {
  const m = await publicClient.readContract({ address: POOL_ADDRESS, abi: PromisePoolAbi, functionName: "members", args: [id, who] });
  return { joined: m[0], side: m[1], checkins: m[2], rejected: m[3] };
}
export async function participantsOf(id: bigint): Promise<readonly Address[]> {
  return publicClient.readContract({ address: POOL_ADDRESS, abi: PromisePoolAbi, functionName: "participantsOf", args: [id] });
}
export async function poolCount(): Promise<bigint> {
  return publicClient.readContract({ address: POOL_ADDRESS, abi: PromisePoolAbi, functionName: "poolCount" });
}
export async function balanceOf(who: Address): Promise<bigint> {
  return publicClient.readContract({ address: TOKEN_ADDRESS, abi: MockAUSDAbi, functionName: "balanceOf", args: [who] });
}

/** Pools the user is part of (MVP: scan recent pools; indexer replaces this later). */
export async function myPools(who: Address, limit = 40): Promise<Pool[]> {
  const n = await poolCount();
  const ids: bigint[] = [];
  for (let i = n; i > 0n && ids.length < limit; i--) ids.push(i);
  const out: Pool[] = [];
  for (const id of ids) {
    const m = await readMember(id, who);
    if (m.joined) out.push(await readPool(id));
    else { const p = await readPool(id); if (p.host.toLowerCase() === who.toLowerCase()) out.push(p); }
  }
  return out;
}

async function ensureGas(s: Session) {
  const bal = await publicClient.getBalance({ address: s.account.address });
  if (bal < 50_000_000_000_000_000n) { // < 0.05 MON: ask the API to sponsor a dust amount
    const res = await fetch(`${API_URL}/relay/sponsor-gas`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: s.account.address }) }).then((r) => r.json()).catch(() => ({}));
    if (res?.hash) {
      await publicClient.waitForTransactionReceipt({ hash: res.hash });
      // Monad consensus checks fees against a balance lagged by a few blocks (~1 s): wait it out
      await new Promise((r) => setTimeout(r, 1800));
    }
  }
}

export async function createPool(s: Session, args: { stakeUnits: bigint; joinUntil: number; endsAt: number; mode: Mode; required: number; meta: Meta; feeBps?: number }) {
  await ensureGas(s);
  saveMeta(args.meta);
  await publishMeta(args.meta);
  const hash = await s.wallet.writeContract({
    address: POOL_ADDRESS, abi: PromisePoolAbi, functionName: "createPool", chain, account: s.account,
    args: [TOKEN_ADDRESS, args.stakeUnits, args.joinUntil, args.endsAt, args.feeBps ?? 400, args.mode, args.required, metaHashOf(args.meta), "0x0000000000000000000000000000000000000000"],
    gas: 350_000n, ...(await fees()),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const id = await poolCount();
  return { hash, id, receipt };
}

/** Testnet only: mint play money so friends can try it. */
export async function faucet(s: Session, units: bigint) {
  if (IS_MAINNET) throw new Error("faucet is testnet only");
  await ensureGas(s);
  const hash = await s.wallet.writeContract({ address: TOKEN_ADDRESS, abi: MockAUSDAbi, functionName: "faucet", chain, account: s.account, args: [s.account.address, units], gas: 120_000n, ...(await fees()) });
  return publicClient.waitForTransactionReceipt({ hash });
}

/** Gasless join: sign an EIP-3009 authorization; the API relays it and pays the gas. */
export async function joinGasless(s: Session, pool: Pool, side: number) {
  const nonce = keccak256(toHex(`${pool.id}-${s.account.address}-${Date.now()}`));
  const validAfter = 0n;
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const sig = await s.wallet.signTypedData({
    account: s.account,
    domain: { name: "AUSD", version: "1", chainId: chain.id, verifyingContract: pool.token },
    types: { ReceiveWithAuthorization: [
      { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
    ] },
    primaryType: "ReceiveWithAuthorization",
    message: { from: s.account.address, to: POOL_ADDRESS, value: pool.stake, validAfter, validBefore, nonce },
  });
  const r = `0x${sig.slice(2, 66)}`, sS = `0x${sig.slice(66, 130)}`, v = parseInt(sig.slice(130, 132), 16);
  const res = await fetch(`${API_URL}/relay/join`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ poolId: pool.id.toString(), side, from: s.account.address, validAfter: validAfter.toString(), validBefore: validBefore.toString(), nonce, v, r, s: sS }) });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "No se pudo unir");
  return j as { hash: Hex };
}

export async function checkIn(s: Session, id: bigint, proof: string) {
  await ensureGas(s);
  const hash = await s.wallet.writeContract({ address: POOL_ADDRESS, abi: PromisePoolAbi, functionName: "checkIn", chain, account: s.account, args: [id, keccak256(toHex(proof))], gas: 120_000n, ...(await fees()) });
  return publicClient.waitForTransactionReceipt({ hash });
}
export async function reportResult(s: Session, id: bigint, winner: 1 | 2) {
  await ensureGas(s);
  const hash = await s.wallet.writeContract({ address: POOL_ADDRESS, abi: PromisePoolAbi, functionName: "reportResult", chain, account: s.account, args: [id, winner], gas: 120_000n, ...(await fees()) });
  return publicClient.waitForTransactionReceipt({ hash });
}
export async function settle(id: bigint) {
  const res = await fetch(`${API_URL}/relay/settle`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ poolId: id.toString() }) });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "Todavía no se puede cerrar");
  return j as { hash: Hex };
}

export async function verifyProof(goal: string, imageDataUrl?: string, note?: string) {
  const res = await fetch(`${API_URL}/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ goal, imageDataUrl, note }) });
  return res.json() as Promise<{ verdict: "ok" | "doubt" | "unverified"; reason?: string }>;
}

export function shareLink(id: bigint, meta?: Meta) {
  const u = new URL(location.href); u.hash = `/p/${id}`;
  if (meta) u.searchParams.set("m", btoa(unescape(encodeURIComponent(JSON.stringify(meta)))));
  return u.toString();
}
export function metaFromUrl(): Meta | undefined {
  const m = new URL(location.href).searchParams.get("m");
  if (!m) return undefined;
  try { const meta = JSON.parse(decodeURIComponent(escape(atob(m)))); saveMeta(meta); return meta; } catch { return undefined; }
}

/**
 * Monad charges the declared gas limit and rejects a tx whose max fee bid is high relative to the
 * sender's balance, so bid just above the current price instead of viem's default 2x base fee.
 */
async function fees() {
  const price = await publicClient.getGasPrice();
  const tip = 2_000_000_000n; // 2 gwei
  return { maxFeePerGas: price + price / 10n + tip, maxPriorityFeePerGas: tip };
}
