import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { keccak256, toHex, parseUnits } from "viem";

const { viem, networkHelpers } = await network.connect();

const STAKE = parseUnits("10", 6); // 10 AUSD

async function setup() {
  const [deployer, fee, a, b, c, d] = await viem.getWalletClients();
  const token = await viem.deployContract("MockAUSD");
  const pool = await viem.deployContract("PromisePool", [fee.account.address]);
  for (const w of [a, b, c, d]) {
    await token.write.faucet([w.account.address, parseUnits("100", 6)]);
    await token.write.approve([pool.address, STAKE], { account: w.account });
  }
  return { deployer, fee, a, b, c, d, token, pool };
}

async function now() {
  const pc = await viem.getPublicClient();
  const block = await pc.getBlock();
  return Number(block.timestamp);
}

describe("PromisePool — PROMISE mode", () => {
  it("those who fail fund those who follow through; fee only on redistributed amount", async () => {
    const { fee, a, b, c, token, pool } = await setup();
    const t = await now();
    await pool.write.createPool([
      token.address, STAKE, BigInt(t + 3600), BigInt(t + 7 * 86400), 400, 0, 3,
      keccak256(toHex("gym 3x/week")), "0x0000000000000000000000000000000000000000",
    ], { account: a.account });

    for (const w of [a, b, c]) await pool.write.join([1n, 0], { account: w.account });
    assert.equal(await token.read.balanceOf([pool.address]), STAKE * 3n);

    // a and b complete 3 check-ins, c only 1
    for (let i = 0; i < 3; i++) {
      await pool.write.checkIn([1n, keccak256(toHex(`a-${i}`))], { account: a.account });
      await pool.write.checkIn([1n, keccak256(toHex(`b-${i}`))], { account: b.account });
    }
    await pool.write.checkIn([1n, keccak256(toHex("c-0"))], { account: c.account });

    await assert.rejects(pool.write.settle([1n]), /TooEarly/);
    await networkHelpers.time.increase(8 * 86400);
    await pool.write.settle([1n]);

    const losersPot = STAKE; // c's stake
    const feeAmt = (losersPot * 400n) / 10_000n; // 4 %
    const share = (losersPot - feeAmt) / 2n;
    assert.equal(await token.read.balanceOf([a.account.address]), parseUnits("100", 6) - STAKE + STAKE + share);
    assert.equal(await token.read.balanceOf([b.account.address]), parseUnits("100", 6) - STAKE + STAKE + share);
    assert.equal(await token.read.balanceOf([c.account.address]), parseUnits("100", 6) - STAKE);
    assert.equal(await token.read.balanceOf([fee.account.address]), feeAmt);
    assert.equal(await token.read.balanceOf([pool.address]), 0n);
  });

  it("everyone succeeds => everyone refunded, no fee", async () => {
    const { fee, a, b, token, pool } = await setup();
    const t = await now();
    await pool.write.createPool([token.address, STAKE, BigInt(t + 3600), BigInt(t + 86400), 400, 0, 1, "0x" + "00".repeat(32), "0x0000000000000000000000000000000000000000"], { account: a.account });
    await pool.write.join([1n, 0], { account: a.account });
    await pool.write.join([1n, 0], { account: b.account });
    await pool.write.checkIn([1n, "0x" + "11".repeat(32)], { account: a.account });
    await pool.write.checkIn([1n, "0x" + "22".repeat(32)], { account: b.account });
    await networkHelpers.time.increase(2 * 86400);
    await pool.write.settle([1n]);
    assert.equal(await token.read.balanceOf([a.account.address]), parseUnits("100", 6));
    assert.equal(await token.read.balanceOf([b.account.address]), parseUnits("100", 6));
    assert.equal(await token.read.balanceOf([fee.account.address]), 0n);
  });

  it("verifier can reject a check-in", async () => {
    const { a, b, token, pool } = await setup();
    const t = await now();
    await pool.write.createPool([token.address, STAKE, BigInt(t + 3600), BigInt(t + 86400), 0, 0, 1, "0x" + "00".repeat(32), b.account.address], { account: a.account });
    await pool.write.join([1n, 0], { account: a.account });
    await pool.write.checkIn([1n, "0x" + "11".repeat(32)], { account: a.account });
    await pool.write.rejectCheckIn([1n, a.account.address], { account: b.account });
    const m = await pool.read.members([1n, a.account.address]);
    assert.equal(m[2], 0); // checkins
    assert.equal(m[3], 1); // rejected
  });
});

describe("PromisePool — MATCH mode", () => {
  it("winning side splits the pool when both sides agree", async () => {
    const { fee, a, b, c, d, token, pool } = await setup();
    const t = await now();
    await pool.write.createPool([token.address, STAKE, BigInt(t + 3600), BigInt(t + 7200), 500, 1, 0, "0x" + "00".repeat(32), "0x0000000000000000000000000000000000000000"], { account: a.account });
    await pool.write.join([1n, 1], { account: a.account });
    await pool.write.join([1n, 1], { account: b.account });
    await pool.write.join([1n, 2], { account: c.account });
    await pool.write.join([1n, 2], { account: d.account });
    await pool.write.reportResult([1n, 1], { account: a.account }); // side A says A won
    await assert.rejects(pool.write.settle([1n]), /TooEarly/);     // other side hasn't confirmed
    await pool.write.reportResult([1n, 1], { account: c.account }); // side B agrees
    await pool.write.settle([1n]);
    const losersPot = STAKE * 2n;
    const feeAmt = (losersPot * 500n) / 10_000n;
    const share = (losersPot - feeAmt) / 2n;
    assert.equal(await token.read.balanceOf([a.account.address]), parseUnits("100", 6) + share);
    assert.equal(await token.read.balanceOf([c.account.address]), parseUnits("100", 6) - STAKE);
    assert.equal(await token.read.balanceOf([fee.account.address]), feeAmt);
  });

  it("conflicting reports => everyone refunded", async () => {
    const { a, c, token, pool } = await setup();
    const t = await now();
    await pool.write.createPool([token.address, STAKE, BigInt(t + 3600), BigInt(t + 7200), 500, 1, 0, "0x" + "00".repeat(32), "0x0000000000000000000000000000000000000000"], { account: a.account });
    await pool.write.join([1n, 1], { account: a.account });
    await pool.write.join([1n, 2], { account: c.account });
    await pool.write.reportResult([1n, 1], { account: a.account });
    await pool.write.reportResult([1n, 2], { account: c.account });
    await pool.write.settle([1n]);
    assert.equal(await token.read.balanceOf([a.account.address]), parseUnits("100", 6));
    assert.equal(await token.read.balanceOf([c.account.address]), parseUnits("100", 6));
  });

  it("one side silent => host-side report wins after the dispute window", async () => {
    const { a, c, token, pool } = await setup();
    const t = await now();
    await pool.write.createPool([token.address, STAKE, BigInt(t + 3600), BigInt(t + 7200), 0, 1, 0, "0x" + "00".repeat(32), "0x0000000000000000000000000000000000000000"], { account: a.account });
    await pool.write.join([1n, 1], { account: a.account });
    await pool.write.join([1n, 2], { account: c.account });
    await pool.write.reportResult([1n, 2], { account: a.account }); // A honestly reports B won
    await assert.rejects(pool.write.settle([1n]), /TooEarly/);
    await networkHelpers.time.increase(25 * 3600);
    await pool.write.settle([1n]);
    assert.equal(await token.read.balanceOf([c.account.address]), parseUnits("100", 6) + STAKE);
  });
});

describe("PromisePool — gasless join (EIP-3009)", () => {
  it("relayer submits a signed authorization; user pays no gas", async () => {
    const { deployer, a, b, token, pool } = await setup();
    const t = await now();
    await pool.write.createPool([token.address, STAKE, BigInt(t + 3600), BigInt(t + 86400), 0, 0, 1, "0x" + "00".repeat(32), "0x0000000000000000000000000000000000000000"], { account: b.account });
    const pc = await viem.getPublicClient();
    const nonce = keccak256(toHex("nonce-1"));
    const validAfter = 0n, validBefore = BigInt(t + 3600);
    const sig = await a.signTypedData({
      domain: { name: "AUSD", version: "1", chainId: await pc.getChainId(), verifyingContract: token.address },
      types: { ReceiveWithAuthorization: [
        { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
      ] },
      primaryType: "ReceiveWithAuthorization",
      message: { from: a.account.address, to: pool.address, value: STAKE, validAfter, validBefore, nonce },
    });
    const r = `0x${sig.slice(2, 66)}` as `0x${string}`;
    const s = `0x${sig.slice(66, 130)}` as `0x${string}`;
    const v = parseInt(sig.slice(130, 132), 16);
    // deployer acts as relayer
    await pool.write.joinWithAuthorization([1n, 0, a.account.address, validAfter, validBefore, nonce, v, r, s], { account: deployer.account });
    const m = await pool.read.members([1n, a.account.address]);
    assert.equal(m[0], true);
    assert.equal(await token.read.balanceOf([pool.address]), STAKE);
  });
});
