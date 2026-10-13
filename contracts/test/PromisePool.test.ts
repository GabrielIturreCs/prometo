import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { keccak256, toHex, parseUnits, zeroAddress } from "viem";

const { viem, networkHelpers } = await network.connect();

const STAKE = parseUnits("10", 6); // 10 AUSD
const START = parseUnits("100", 6);
const DAY = 86400;
const H = (s: string) => keccak256(toHex(s));

async function setup() {
  const [deployer, fee, a, b, c, d] = await viem.getWalletClients();
  const token = await viem.deployContract("MockAUSD");
  const pool = await viem.deployContract("PromisePool", [fee.account.address]);
  for (const w of [a, b, c, d]) {
    await token.write.faucet([w.account.address, START]);
    await token.write.approve([pool.address, STAKE * 10n], { account: w.account });
  }
  return { deployer, fee, a, b, c, d, token, pool };
}

const promise = (pool: any, token: any, host: any, days: number, required: number, feeBps = 400) =>
  pool.write.createPool([token.address, STAKE, days * DAY, feeBps, 0, required, 0, H("meta"), zeroAddress], { account: host.account });
const match = (pool: any, token: any, host: any, maxPerSide = 0, feeBps = 500) =>
  pool.write.createPool([token.address, STAKE, 3 * 3600, feeBps, 1, 0, maxPerSide, H("meta"), zeroAddress], { account: host.account });

describe("PromisePool — lobby", () => {
  it("nothing starts until the host starts it with at least two people; leaving refunds", async () => {
    const { a, b, c, token, pool } = await setup();
    await promise(pool, token, a, 7, 3);
    await pool.write.join([1n, 0], { account: a.account });
    await assert.rejects(pool.write.checkIn([1n, H("x")], { account: a.account }), /WrongStatus/);
    await assert.rejects(pool.write.start([1n], { account: a.account }), /NotEnoughPlayers/);
    await pool.write.join([1n, 0], { account: b.account });
    await pool.write.join([1n, 0], { account: c.account });
    await pool.write.leave([1n], { account: b.account });
    assert.equal(await token.read.balanceOf([b.account.address]), START);
    assert.deepEqual((await pool.read.participantsOf([1n])).map((x: string) => x.toLowerCase()).sort(), [a.account.address, c.account.address].map((x) => x.toLowerCase()).sort());
    await assert.rejects(pool.write.start([1n], { account: c.account }), /NotHost/);
    await pool.write.start([1n], { account: a.account });
    await assert.rejects(pool.write.join([1n, 0], { account: b.account }), /WrongStatus/);
    await assert.rejects(pool.write.leave([1n], { account: c.account }), /WrongStatus/);
  });

  it("host can cancel the lobby; anyone can after it expires", async () => {
    const { a, b, token, pool } = await setup();
    await promise(pool, token, a, 7, 3);
    await pool.write.join([1n, 0], { account: a.account });
    await pool.write.join([1n, 0], { account: b.account });
    await assert.rejects(pool.write.cancel([1n], { account: b.account }), /NotHost/);
    await networkHelpers.time.increase(8 * DAY);
    await pool.write.cancel([1n], { account: b.account });
    assert.equal(await token.read.balanceOf([a.account.address]), START);
    assert.equal(await token.read.balanceOf([b.account.address]), START);
  });
});

describe("PromisePool — PROMISE", () => {
  it("those who fail fund those who follow through; one check-in per day; fee only on redistributed", async () => {
    const { fee, a, b, c, token, pool } = await setup();
    await promise(pool, token, a, 3, 3);
    for (const w of [a, b, c]) await pool.write.join([1n, 0], { account: w.account });
    await pool.write.start([1n], { account: a.account });
    await pool.write.checkIn([1n, H("c0")], { account: c.account });
    for (let i = 0; i < 3; i++) {
      await pool.write.checkIn([1n, H(`a${i}`)], { account: a.account });
      await pool.write.checkIn([1n, H(`b${i}`)], { account: b.account });
      if (i === 0) await assert.rejects(pool.write.checkIn([1n, H("again")], { account: a.account }), /AlreadyCheckedInToday/);
      await networkHelpers.time.increase(DAY);
    }
    await assert.rejects(pool.write.checkIn([1n, H("late")], { account: c.account }), /PromiseEnded/);
    await pool.write.settle([1n]);
    const feeAmt = (STAKE * 400n) / 10_000n;
    const share = (STAKE - feeAmt) / 2n;
    assert.equal(await token.read.balanceOf([a.account.address]), START + share);
    assert.equal(await token.read.balanceOf([b.account.address]), START + share);
    assert.equal(await token.read.balanceOf([c.account.address]), START - STAKE);
    assert.equal(await token.read.balanceOf([fee.account.address]), feeAmt);
    assert.equal(await token.read.balanceOf([pool.address]), 0n);
  });

  it("everyone succeeds => everyone refunded, no fee", async () => {
    const { fee, a, b, token, pool } = await setup();
    await promise(pool, token, a, 1, 1);
    await pool.write.join([1n, 0], { account: a.account });
    await pool.write.join([1n, 0], { account: b.account });
    await pool.write.start([1n], { account: a.account });
    await pool.write.checkIn([1n, H("a")], { account: a.account });
    await pool.write.checkIn([1n, H("b")], { account: b.account });
    await assert.rejects(pool.write.settle([1n]), /TooEarly/);
    await networkHelpers.time.increase(DAY);
    await pool.write.settle([1n]);
    assert.equal(await token.read.balanceOf([a.account.address]), START);
    assert.equal(await token.read.balanceOf([fee.account.address]), 0n);
  });
});

describe("PromisePool — MATCH", () => {
  it("both sides agree => every player of the winning side gets stake + share", async () => {
    const { fee, a, b, c, d, token, pool } = await setup();
    await match(pool, token, a, 2);
    await pool.write.join([1n, 1], { account: a.account });
    await pool.write.join([1n, 1], { account: b.account });
    await assert.rejects(pool.write.join([1n, 1], { account: c.account }), /Full/); // 2 vs 2
    await pool.write.join([1n, 2], { account: c.account });
    await pool.write.join([1n, 2], { account: d.account });
    await pool.write.start([1n], { account: a.account });
    await pool.write.reportResult([1n, 1], { account: b.account });
    await assert.rejects(pool.write.settle([1n]), /TooEarly/);
    await pool.write.reportResult([1n, 1], { account: d.account }); // losers accept
    await pool.write.settle([1n]);
    const feeAmt = (STAKE * 2n * 500n) / 10_000n;
    const share = (STAKE * 2n - feeAmt) / 2n;
    assert.equal(await token.read.balanceOf([a.account.address]), START + share);
    assert.equal(await token.read.balanceOf([b.account.address]), START + share);
    assert.equal(await token.read.balanceOf([c.account.address]), START - STAKE);
    assert.equal(await token.read.balanceOf([fee.account.address]), feeAmt);
  });

  it("a side can fix a mistaken report before both agree", async () => {
    const { a, c, token, pool } = await setup();
    await match(pool, token, a, 1, 0);
    await pool.write.join([1n, 1], { account: a.account });
    await pool.write.join([1n, 2], { account: c.account });
    await pool.write.start([1n], { account: a.account });
    await pool.write.reportResult([1n, 2], { account: a.account }); // oops
    await pool.write.reportResult([1n, 1], { account: a.account }); // fixed
    await pool.write.reportResult([1n, 1], { account: c.account }); // c accepts the loss
    await assert.rejects(pool.write.reportResult([1n, 2], { account: c.account }), /WrongStatus/); // locked once agreed
    await pool.write.settle([1n]);
    assert.equal(await token.read.balanceOf([a.account.address]), START + STAKE);
  });

  it("still disagree 24 h after the last report => refund", async () => {
    const { a, c, token, pool } = await setup();
    await match(pool, token, a);
    await pool.write.join([1n, 1], { account: a.account });
    await pool.write.join([1n, 2], { account: c.account });
    await pool.write.start([1n], { account: a.account });
    await pool.write.reportResult([1n, 1], { account: a.account });
    await pool.write.reportResult([1n, 2], { account: c.account });
    await assert.rejects(pool.write.settle([1n]), /TooEarly/);
    await networkHelpers.time.increase(DAY + 1);
    await pool.write.settle([1n]);
    assert.equal(await token.read.balanceOf([a.account.address]), START);
    assert.equal(await token.read.balanceOf([c.account.address]), START);
  });

  it("one side silent => the other side's report stands after 24 h", async () => {
    const { a, c, token, pool } = await setup();
    await match(pool, token, a, 0, 0);
    await pool.write.join([1n, 1], { account: a.account });
    await pool.write.join([1n, 2], { account: c.account });
    await pool.write.start([1n], { account: a.account });
    await pool.write.reportResult([1n, 2], { account: a.account }); // a honestly reports c won
    await networkHelpers.time.increase(DAY + 1);
    await pool.write.settle([1n]);
    assert.equal(await token.read.balanceOf([c.account.address]), START + STAKE);
  });
});

describe("PromisePool — gasless join (EIP-3009)", () => {
  it("relayer submits a signed authorization; user pays no gas", async () => {
    const { deployer, a, b, token, pool } = await setup();
    await promise(pool, token, b, 7, 3);
    const pc = await viem.getPublicClient();
    const nonce = H("nonce-1");
    const validBefore = (await pc.getBlock()).timestamp + BigInt(10 * DAY);
    const sig = await a.signTypedData({
      domain: { name: "AUSD", version: "1", chainId: await pc.getChainId(), verifyingContract: token.address },
      types: { ReceiveWithAuthorization: [
        { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
      ] },
      primaryType: "ReceiveWithAuthorization",
      message: { from: a.account.address, to: pool.address, value: STAKE, validAfter: 0n, validBefore, nonce },
    });
    await pool.write.joinWithAuthorization([1n, 0, a.account.address, 0n, validBefore, nonce, parseInt(sig.slice(130, 132), 16), `0x${sig.slice(2, 66)}`, `0x${sig.slice(66, 130)}`], { account: deployer.account });
    assert.equal((await pool.read.members([1n, a.account.address]))[0], true);
    assert.equal(await token.read.balanceOf([pool.address]), STAKE);
  });
});
