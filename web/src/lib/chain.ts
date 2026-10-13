import { createPublicClient, http, type Address } from "viem";
import { monad, monadTestnet, hardhat } from "viem/chains";

export const IS_MAINNET = import.meta.env.VITE_CHAIN === "mainnet";
export const IS_LOCAL = import.meta.env.VITE_CHAIN === "local";
export const chain = IS_MAINNET ? monad : IS_LOCAL ? hardhat : monadTestnet;
export const RPC_URL: string = import.meta.env.VITE_RPC_URL || chain.rpcUrls.default.http[0];
export const POOL_ADDRESS = (import.meta.env.VITE_POOL_ADDRESS || "0x0000000000000000000000000000000000000000") as Address;
export const TOKEN_ADDRESS = (import.meta.env.VITE_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000") as Address;
export const API_URL: string = import.meta.env.VITE_API_URL || "http://127.0.0.1:8799";
export const EXPLORER = IS_MAINNET ? "https://monadvision.com" : "https://testnet.monadvision.com";
export const txUrl = (h: string) => (IS_LOCAL ? "#" : `${EXPLORER}/tx/${h}`);

export const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });

/** AUSD has 6 decimals on mainnet; the testnet mock mirrors it. */
export const DECIMALS = 6;
export const fmtUsd = (units: bigint) => {
  const n = Number(units) / 10 ** DECIMALS;
  return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};
export const toUnits = (usd: number) => BigInt(Math.round(usd * 10 ** DECIMALS));
