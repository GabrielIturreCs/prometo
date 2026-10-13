# Prometo

**Put money behind your word.** Friends put digital dollars behind a goal; those who fail fund those who follow through. Also works for friendly tournaments: only players put in, the winning side takes the pool.

- Live app (Monad testnet): https://web.gabriel13iturre.workers.dev
- API: https://prometo-api.gabriel13iturre.workers.dev/health
- Built for **Monad Metropolis 2026**, Track 02 — Consumer Products & Payments.

## The problem

Most people already know what they should do: train, study, sleep, stop scrolling. What they lack is skin in the game and someone watching. Group chats are full of "starting Monday" promises that nobody tracks. Commitment contracts work (StickK, DietBet), but they are custodial, country-locked, and slow to pay out.

Prometo makes a promise between friends a real commitment: a shared pool, proof from your phone, and automatic settlement — in any country, with no bank account, no seed phrase and no gas.

**First users:** groups of friends and couples in LATAM who already make informal bets on gym streaks, study goals and weekend matches.

## How it works

1. **Sign in with Face ID / fingerprint.** Accounts are derived from a passkey with [Mera](https://docs.monad.xyz/guides/mera) (WebAuthn PRF → standard EVM account). No seed phrase, no extension, no custody backend.
2. **Create a promise** ("gym 3x a week for 4 weeks, $10 each"). Creating it also puts in your own stake — one tap. It opens a **waiting room**: invite friends in the app or share the link; everyone who joins puts in their stake and can leave with a full refund until it starts.
   The host taps **Start** once at least two people are in; the clock runs from that moment.
3. **Friends join gaslessly.** They sign an EIP-3009 `receiveWithAuthorization` for exactly the stake; our relayer submits it and pays the gas. The signature can only move that amount into the pool contract.
4. **Check in with a photo.** The photo is stored on Cloudflare R2, a vision model (Llama 3.2 Vision on Workers AI) gives a first opinion, and the photo's SHA-256 is recorded onchain as the check-in proof. Friends see every proof and can flag doubtful ones.
5. **One check-in per day.** The contract enforces it, counted in 24 h windows from the moment the promise was created; extra photos can be added to the gallery.
6. **Friends and invites.** People who promise together become friends automatically; you can invite them to a new promise inside the app (no link needed) or send them dollars.
7. **Settle.** After the deadline anyone can settle: those who reached the required check-ins get their stake back plus an equal share of the stakes of those who did not. If everybody succeeds (or nobody does), everyone is refunded and no fee is charged.

**Friendly challenges (MATCH mode):** 1v1 up to 5v5 or teams, only players stake (no spectators, no betting). After the start each side reports the winner and can fix a mistaken report until both sides agree; then every player of the winning side gets their stake back plus an equal share of the losing side. If one side never answers, the other side's report stands after 24 h; if they still disagree 24 h after the last report, everyone is refunded.

## Why Monad

- A single promise produces dozens of small transactions (joins, check-ins, objections, settlement). With ~300 ms blocks, ~600 ms finality and near-zero fees the app feels like a chat app, not a bank.
- Settlement pays N participants atomically in one transaction.
- AUSD (Agora), the largest stablecoin on Monad, supports EIP-3009, so users never need MON: the relayer pays the gas. On testnet a mock AUSD with the same interface is used.
- Mera passkey accounts are plain EOAs: no bundler, no smart-account deployment.

## Deployed contracts (Monad testnet, chain 10143)

| Contract | Address |
|---|---|
| PromisePool | [`0x27750eed6fe4fd05d89e53e569d6e4ae20c3e2fe`](https://testnet.monadvision.com/address/0x27750eed6fe4fd05d89e53e569d6e4ae20c3e2fe) |
| MockAUSD (6 decimals, EIP-3009) | [`0x6241b12f94d2b753618666cb093b973fa5da4b9f`](https://testnet.monadvision.com/address/0x6241b12f94d2b753618666cb093b973fa5da4b9f) |

Example transactions: [send dollars to a friend](https://testnet.monadvision.com/tx/0x42b02214e076b63052c28423ca1a300dcf1d2969afdf161f96530bee17646779).

On mainnet the same `PromisePool` is deployed against real AUSD (`0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a`).

## Architecture

```
 Phone (PWA)                          Cloudflare                         Monad
 ───────────                          ──────────                         ─────
 Mera passkey ─► EVM account
 create / check-in / report ───────────────────────────────────────────► PromisePool
 sign EIP-3009 auth ─► Worker /relay/join ─► joinWithAuthorization ────► PromisePool ◄─ AUSD
 photo ─► Worker /proof ─► R2 (photo) + Workers AI (verdict)
                           sha256 ──────────────────────────── checkIn(proofHash)
 names / promise metadata ─► Worker ─► KV (signed / content-addressed)
```

- `contracts/` — Solidity 0.8.28, Hardhat 3, OpenZeppelin. `PromisePool.sol`, `MockAUSD.sol`, tests in `test/`.
- `web/` — Vite + React + TypeScript PWA, viem, `@category-labs/mera`. Deployed as a Cloudflare Worker with static assets.
- `worker/` — Cloudflare Worker (Hono): gas relayer, gas sponsorship for fresh accounts, signed display names and content-addressed promise metadata (KV), check-in photos (R2) and AI review (Workers AI).

### Security notes

- Pool contracts are non-custodial: funds only move between participants (plus an optional fee, max 10 %, charged only on the redistributed amount). No admin withdrawal path.
- The relayer cannot redirect funds: EIP-3009 authorizations name the pool contract as payee and the exact amount; the contract also checks the received balance.
- Display names require a signature from the account; promise metadata is keyed by its keccak256, the same hash stored onchain.
- Test mode ("Probar sin huella") exists only on testnet, so judges on desktop browsers without PRF passkeys can try the app. It is disabled on mainnet.
- No token, no yield, no fiat on/off-ramp.

## Run locally

Requirements: Node 20+.

```bash
# contracts
cd contracts && npm install
npx hardhat test
npx hardhat node                                   # terminal 1
npx hardhat run scripts/deploy.ts --network localhost

# API (copy the local addresses into worker/.dev.vars)
cd ../worker && npm install
cat > .dev.vars <<'EOF'
CHAIN=local
RPC_URL=http://127.0.0.1:8545
POOL_ADDRESS=<pool address from deploy>
RELAYER_KEY=<a funded local key>
EOF
npx wrangler dev --port 8799

# web
cd ../web && npm install
cat > .env.development.local <<'EOF'
VITE_CHAIN=local
VITE_RPC_URL=http://127.0.0.1:8545
VITE_POOL_ADDRESS=<pool address>
VITE_TOKEN_ADDRESS=<token address>
VITE_API_URL=http://127.0.0.1:8799
EOF
npm run dev
```

Deploy to Monad testnet: put `DEPLOYER_KEY` in `contracts/.env`, then `npx hardhat run scripts/deploy.ts --network monadTestnet`. Deploy the API with `npx wrangler deploy` (set `RELAYER_KEY` with `wrangler secret put`) and the web app with `npm run build && npx wrangler deploy` from `web/`.

## Built during Metropolis

All code in this repository was written during the Metropolis build window (September–October 2026). No pre-existing code from the author was used. Third-party libraries: OpenZeppelin Contracts (MIT), viem (MIT), Mera by Category Labs (MIT/Apache-2.0), Hono (MIT), React (MIT), lucide-react (ISC), @scure/bip32 and bip39 (MIT).

## Use of AI tools (disclosure)

This project was built by a solo founder with the help of AI coding tools, as allowed by the Metropolis rules (§4.1.4):

- **Claude Code (Anthropic)** was used for research (rules, judging criteria, market), to write and refactor most of the code (contracts, tests, web app, Cloudflare Worker), and to run tests and deployments under the author's supervision.
- **Workers AI (Llama 3.2 11B Vision)** is used *inside the product* to give a first opinion on check-in photos. It never moves funds; it only labels a proof as "looks good" or "friends should review".

All product decisions, design direction and testing with real users were made by the author.

## License

MIT — see [LICENSE](./LICENSE).
