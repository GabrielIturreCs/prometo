import { Hono } from "hono";
import { cors } from "hono/cors";
import { createPublicClient, createWalletClient, http, keccak256, toHex, verifyMessage, type Hex, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monad, monadTestnet, hardhat } from "viem/chains";
import { PromisePoolAbi } from "./abi/PromisePool";

type Env = {
  DATA: KVNamespace;          // profiles (name per account) and promise metadata
  PROOFS: R2Bucket;           // check-in photos
  AI: Ai;                     // Workers AI (vision model for check-in photos)
  RELAYER_KEY: Hex;          // pays MON gas so users never see "gas"
  POOL_ADDRESS: Address;
  CHAIN: "testnet" | "mainnet" | "local";
  RPC_URL?: string;
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
    // people who promised together become friends (an onchain fact, so no signature needed)
    if (receipt.status === "success") {
      const list = await pub.readContract({ address: c.env.POOL_ADDRESS, abi: PromisePoolAbi, functionName: "participantsOf", args: [BigInt(body.poolId)] });
      c.executionCtx.waitUntil(befriend(c.env, body.from, list as readonly Address[]));
    }
    return c.json({ hash, status: receipt.status });
  } catch (e: any) {
    return c.json({ error: e.shortMessage || e.message }, 400);
  }
});

/* ------------------------------------------------------------ friends & in-app invites */

const lc = (a: string) => a.toLowerCase();
async function readList(env: Env, key: string): Promise<string[]> {
  try { return JSON.parse((await env.DATA.get(key)) || "[]"); } catch { return []; }
}
async function addFriend(env: Env, a: string, b: string) {
  if (lc(a) === lc(b)) return;
  const key = `friends:${lc(a)}`;
  const list = await readList(env, key);
  if (!list.includes(lc(b))) { list.unshift(lc(b)); await env.DATA.put(key, JSON.stringify(list.slice(0, 200))); }
}
async function befriend(env: Env, who: string, others: readonly string[]) {
  for (const o of others) { await addFriend(env, who, o); await addFriend(env, o, who); }
}

app.get("/friends/:addr", async (c) => c.json(await readList(c.env, `friends:${lc(c.req.param("addr"))}`)));

/** Add a friend from their profile link or QR. Signed by the account that adds. */
app.put("/friends", async (c) => {
  const { address, friend, signature } = await c.req.json<{ address: Address; friend: Address; signature: Hex }>();
  if (!/^0x[0-9a-fA-F]{40}$/.test(friend)) return c.json({ error: "bad friend" }, 400);
  const ok = await verifyMessage({ address, message: `Prometo: agregar amigo ${lc(friend)}`, signature });
  if (!ok) return c.json({ error: "bad signature" }, 401);
  await befriend(c.env, address, [friend]);
  return c.json({ ok: true });
});

/** Invite friends to a promise inside the app. */
app.post("/invite", async (c) => {
  const { from, to, poolId, signature } = await c.req.json<{ from: Address; to: Address[]; poolId: string; signature: Hex }>();
  if (!/^\d+$/.test(poolId) || !Array.isArray(to) || to.length === 0 || to.length > 30) return c.json({ error: "bad params" }, 400);
  const ok = await verifyMessage({ address: from, message: `Prometo: invitar a la promesa ${poolId}`, signature });
  if (!ok) return c.json({ error: "bad signature" }, 401);
  const at = Date.now();
  for (const t of to) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(t)) continue;
    const key = `inbox:${lc(t)}`;
    let inbox: any[] = [];
    try { inbox = JSON.parse((await c.env.DATA.get(key)) || "[]"); } catch { /* reset */ }
    inbox = [{ from: lc(from), poolId, pool: lc(c.env.POOL_ADDRESS), at }, ...inbox.filter((x) => x.poolId !== poolId || x.pool !== lc(c.env.POOL_ADDRESS))].slice(0, 50);
    await c.env.DATA.put(key, JSON.stringify(inbox));
  }
  return c.json({ ok: true });
});

app.get("/inbox/:addr", async (c) => {
  try { const all: any[] = JSON.parse((await c.env.DATA.get(`inbox:${lc(c.req.param("addr"))}`)) || "[]"); return c.json(all.filter((x) => x.pool === lc(c.env.POOL_ADDRESS))); }
  catch { return c.json([]); }
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

/* ------------------------------------------------------------ check-in photos */

const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

async function askVision(env: Env, goal: string, note: string, bytes: Uint8Array) {
  const prompt = `You verify proof for a personal commitment app. Goal: "${goal}". User note: "${note || "-"}". Does this photo plausibly show the goal being done today? Reply ONLY with JSON {"ok":true|false,"reason":"max 8 words, in Spanish"}.`;
  let b64 = "";
  for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const dataUrl = `data:image/jpeg;base64,${btoa(b64)}`;
  const run = () => env.AI.run(VISION_MODEL as any, {
    messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: dataUrl } }] }],
    max_tokens: 80,
  } as any) as Promise<any>;
  let out: any;
  try { out = await run(); }
  catch (e: any) {
    // Meta's license must be accepted once per account
    if (/agree/i.test(String(e?.message))) { await env.AI.run(VISION_MODEL as any, { prompt: "agree" } as any); out = await run(); }
    else throw e;
  }
  const resp = out?.response;
  // the model sometimes returns the JSON already parsed
  const j = typeof resp === "object" && resp !== null
    ? resp
    : JSON.parse(String(resp ?? "").slice(String(resp ?? "").indexOf("{"), String(resp ?? "").lastIndexOf("}") + 1));
  return { verdict: j.ok ? "ok" : "doubt", reason: String(j.reason || "").slice(0, 80) } as const;
}

/**
 * Upload a check-in photo. Stored in R2 under the pool and the user, content-addressed by
 * SHA-256; that hash is what the app records onchain as the check-in proofHash. Workers AI gives
 * a first opinion; the group still has 24 h to object.
 */
app.post("/proof", async (c) => {
  const { poolId, address, goal, note, imageDataUrl } = await c.req.json<{ poolId: string; address: Address; goal: string; note?: string; imageDataUrl?: string }>();
  if (!/^\d+$/.test(poolId) || !/^0x[0-9a-fA-F]{40}$/.test(address)) return c.json({ error: "bad params" }, 400);
  let bytes = new Uint8Array();
  if (imageDataUrl) {
    const b64 = imageDataUrl.split(",")[1] || "";
    if (b64.length > 900_000) return c.json({ error: "La foto es muy pesada" }, 413);
    bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  }
  const material = new Uint8Array([...bytes, ...new TextEncoder().encode(`${poolId}|${address}|${note || ""}|${Date.now()}`)]);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", material));
  const sha = ("0x" + [...digest].map((b) => b.toString(16).padStart(2, "0")).join("")) as Hex;
  const key = `${lc(c.env.POOL_ADDRESS)}/${poolId}/${address.toLowerCase()}/${sha}`; // namespaced by contract

  let verdict: { verdict: "ok" | "doubt" | "unverified"; reason: string } = { verdict: "unverified", reason: "" };
  if (bytes.length) {
    try { verdict = await askVision(c.env, goal, note || "", bytes); }
    catch (e) { console.error("vision failed", (e as Error)?.message); verdict = { verdict: "unverified", reason: "" }; }
  }
  await c.env.PROOFS.put(key, bytes.length ? bytes : new TextEncoder().encode(note || ""), {
    httpMetadata: { contentType: bytes.length ? "image/jpeg" : "text/plain; charset=utf-8" },
    customMetadata: { note: (note || "").slice(0, 200), verdict: verdict.verdict, reason: verdict.reason, at: String(Date.now()) },
  });
  return c.json({ sha, key, ...verdict });
});

/** All check-in proofs of a pool (for the group to review). */
app.get("/proofs/:poolId", async (c) => {
  const list = await c.env.PROOFS.list({ prefix: `${lc(c.env.POOL_ADDRESS)}/${c.req.param("poolId")}/`, include: ["customMetadata", "httpMetadata"] } as any);
  const items = list.objects.map((o: any) => ({
    key: o.key, address: o.key.split("/")[2], sha: o.key.split("/")[3],
    isImage: (o.httpMetadata?.contentType || "").startsWith("image/"), ...o.customMetadata,
  })).sort((a: any, b: any) => Number(b.at) - Number(a.at));
  return c.json(items);
});

app.get("/img/*", async (c) => {
  const key = c.req.path.replace(/^\/img\//, "");
  const obj = await c.env.PROOFS.get(key);
  if (!obj) return c.text("not found", 404);
  return new Response(obj.body, { headers: { "content-type": obj.httpMetadata?.contentType || "application/octet-stream", "cache-control": "public, max-age=31536000, immutable" } });
});

export default app;
