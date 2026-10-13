import { Hono } from "hono";
import { cors } from "hono/cors";
import { createPublicClient, createWalletClient, http, keccak256, toHex, verifyMessage, type Hex, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monad, monadTestnet, hardhat } from "viem/chains";
import { PromisePoolAbi } from "./abi/PromisePool";

type Env = {
  DATA: KVNamespace;          // profiles (name per account) and promise metadata
  RELAYER_KEY: Hex;          // pays MON gas so users never see "gas"
  POOL_ADDRESS: Address;
  CHAIN: "testnet" | "mainnet" | "local";
  RPC_URL?: string;
  AI_API_KEY?: string;        // Kimi (Moonshot) or any OpenAI-compatible endpoint
  AI_BASE_URL?: string;
  AI_MODEL?: string;
};

const app = new Hono<{ Bindings: Env }>();
app.use("*", cors());

function chainOf(env: Env) {
  return env.CHAIN === "mainnet" ? monad : env.CHAIN === "local" ? hardhat : monadTestnet;
}
function clients(env: Env) {
  const chain = chainOf(env);
  const transport = http(env.RPC_URL || chain.rpcUrls.default.http[0]);
  const account = privateKeyToAccount(env.RELAYER_KEY);
  return {
    account,
    pub: createPublicClient({ chain, transport }),
    wallet: createWalletClient({ chain, transport, account }),
  };
}

app.get("/health", (c) => c.json({ ok: true, chain: c.env.CHAIN, pool: c.env.POOL_ADDRESS }));

/* ------------------------------------------------------------ profiles & metadata (offchain) */

/** Set a display name. The account signs the exact message, so nobody can rename someone else. */
app.put("/profile", async (c) => {
  const { address, name, signature } = await c.req.json<{ address: Address; name: string; signature: Hex }>();
  const clean = (name || "").trim().slice(0, 32);
  if (!clean) return c.json({ error: "empty name" }, 400);
  const ok = await verifyMessage({ address, message: `Prometo: mi nombre es ${clean}`, signature });
  if (!ok) return c.json({ error: "bad signature" }, 401);
  await c.env.DATA.put(`name:${address.toLowerCase()}`, clean);
  return c.json({ ok: true });
});

/** Batch lookup of names: GET /names?a=0x..,0x.. */
app.get("/names", async (c) => {
  const list = (c.req.query("a") || "").split(",").filter(Boolean).slice(0, 64);
  const out: Record<string, string> = {};
  await Promise.all(list.map(async (a) => { const n = await c.env.DATA.get(`name:${a.toLowerCase()}`); if (n) out[a.toLowerCase()] = n; }));
  return c.json(out);
});

/** Store promise metadata. Content-addressed: the key must equal keccak256 of the JSON, which is
 *  what the contract stores as metaHash, so metadata can't be swapped after creation. */
app.put("/meta/:hash", async (c) => {
  const hash = c.req.param("hash") as Hex;
  const raw = await c.req.text();
  if (raw.length > 2000) return c.json({ error: "too big" }, 413);
  if (keccak256(toHex(raw)) !== hash) return c.json({ error: "hash mismatch" }, 400);
  await c.env.DATA.put(`meta:${hash}`, raw);
  return c.json({ ok: true });
});
app.get("/meta/:hash", async (c) => {
  const raw = await c.env.DATA.get(`meta:${c.req.param("hash")}`);
  return raw ? c.body(raw, 200, { "content-type": "application/json" }) : c.json({ error: "not found" }, 404);
});

/**
 * Gasless join: the user signed an EIP-3009 ReceiveWithAuthorization for the pool contract.
 * We submit it and pay the gas. The signature can only move exactly `stake` into the pool, so a
 * malicious relayer cannot redirect funds.
 */
app.post("/relay/join", async (c) => {
  const body = await c.req.json<{
    poolId: string; side: number; from: Address;
    validAfter: string; validBefore: string; nonce: Hex; v: number; r: Hex; s: Hex;
  }>();
  const { pub, wallet, account } = clients(c.env);
  try {
    const { request } = await pub.simulateContract({
      address: c.env.POOL_ADDRESS,
      abi: PromisePoolAbi,
      functionName: "joinWithAuthorization",
      args: [BigInt(body.poolId), body.side, body.from, BigInt(body.validAfter), BigInt(body.validBefore), body.nonce, body.v, body.r, body.s],
      account,
      gas: 400_000n, // Monad charges the declared limit: keep it tight
    });
    const hash = await wallet.writeContract(request);
    const receipt = await pub.waitForTransactionReceipt({ hash });
    return c.json({ hash, status: receipt.status });
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message }, 400);
  }
});

/**
 * Sponsored call for actions that are not value transfers (check-in, report, settle) when the
 * user has no MON. The user signs an EIP-712 "Intent" offchain; for the hackathon MVP we accept
 * the intent and forward it, since each of these calls can only affect the caller's own record.
 * NOTE: for check-in/report the contract uses msg.sender, so the MVP calls them from the user's
 * own account (funded with a dust amount of MON on first login). settle() is permissionless.
 */
app.post("/relay/settle", async (c) => {
  const { poolId } = await c.req.json<{ poolId: string }>();
  const { pub, wallet, account } = clients(c.env);
  try {
    const { request } = await pub.simulateContract({
      address: c.env.POOL_ADDRESS, abi: PromisePoolAbi, functionName: "settle",
      args: [BigInt(poolId)], account, gas: 1_500_000n,
    });
    const hash = await wallet.writeContract(request);
    const receipt = await pub.waitForTransactionReceipt({ hash });
    return c.json({ hash, status: receipt.status });
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message }, 400);
  }
});

/** Give a fresh passkey account a dust amount of MON so it can check in on its own. */
app.post("/relay/sponsor-gas", async (c) => {
  const { to } = await c.req.json<{ to: Address }>();
  const { pub, wallet } = clients(c.env);
  const bal = await pub.getBalance({ address: to });
  if (bal > 200_000_000_000_000_000n) return c.json({ skipped: true }); // > 0.2 MON already
  const hash = await wallet.sendTransaction({ to, value: 500_000_000_000_000_000n, gas: 21_000n }); // 0.5 MON
  return c.json({ hash });
});

/**
 * AI pre-verification of a check-in proof (photo + goal). Returns a verdict the app shows and
 * the group can object to within 24h. Uses an OpenAI-compatible chat endpoint (Kimi by default).
 */
app.post("/verify", async (c) => {
  const { goal, imageDataUrl, note } = await c.req.json<{ goal: string; imageDataUrl?: string; note?: string }>();
  if (!c.env.AI_API_KEY) return c.json({ verdict: "unverified", reason: "AI not configured" });
  const content: any[] = [{ type: "text", text: `Goal: ${goal}\nUser note: ${note || "-"}\nDoes this proof plausibly show the goal was completed today? Answer JSON {"ok":true|false,"reason":"<10 words"}` }];
  if (imageDataUrl) content.push({ type: "image_url", image_url: { url: imageDataUrl } });
  const res = await fetch(`${c.env.AI_BASE_URL || "https://api.moonshot.ai/v1"}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${c.env.AI_API_KEY}` },
    body: JSON.stringify({ model: c.env.AI_MODEL || "kimi-k2.5", messages: [{ role: "user", content }], temperature: 0 }),
  });
  const data: any = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  try {
    const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return c.json({ verdict: j.ok ? "ok" : "doubt", reason: j.reason });
  } catch {
    return c.json({ verdict: "unverified", reason: "AI answer unreadable" });
  }
});

export default app;
