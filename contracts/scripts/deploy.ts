import { network } from "hardhat";
import fs from "node:fs";

const { viem, networkName } = await network.connect();
const [deployer] = await viem.getWalletClients();
const pc = await viem.getPublicClient();
console.log("network:", networkName, "deployer:", deployer.account.address);

// On mainnet use real AUSD; elsewhere deploy the EIP-3009 mock.
const AUSD_MAINNET = "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a";
let token: `0x${string}`;
if (networkName === "monad") token = AUSD_MAINNET;
else token = (await viem.deployContract("MockAUSD")).address;

const feeRecipient = process.env.FEE_RECIPIENT || deployer.account.address;
const pool = await viem.deployContract("PromisePool", [feeRecipient as `0x${string}`]);
const out = { network: networkName, chainId: await pc.getChainId(), token, pool: pool.address, feeRecipient, at: new Date().toISOString() };
console.log(out);
fs.mkdirSync("deployments", { recursive: true });
fs.writeFileSync(`deployments/${networkName}.json`, JSON.stringify(out, null, 2));
