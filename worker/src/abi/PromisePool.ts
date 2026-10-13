export const PromisePoolAbi = [
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "_feeRecipient",
    "type": "address"
   }
  ],
  "stateMutability": "nonpayable",
  "type": "constructor"
 },
 {
  "inputs": [],
  "name": "AlreadyCheckedInToday",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "AlreadyJoined",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "BadParams",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "Full",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "NotEnoughPlayers",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "NotHost",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "NotMember",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "NotVerifier",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "PromiseEnded",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "ReentrancyGuardReentrantCall",
  "type": "error"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "token",
    "type": "address"
   }
  ],
  "name": "SafeERC20FailedOperation",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "TooEarly",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "WrongMode",
  "type": "error"
 },
 {
  "inputs": [],
  "name": "WrongStatus",
  "type": "error"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   }
  ],
  "name": "Cancelled",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "user",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint16",
    "name": "count",
    "type": "uint16"
   }
  ],
  "name": "CheckInRejected",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "user",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint16",
    "name": "count",
    "type": "uint16"
   },
   {
    "indexed": false,
    "internalType": "bytes32",
    "name": "proofHash",
    "type": "bytes32"
   }
  ],
  "name": "CheckedIn",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "user",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint8",
    "name": "side",
    "type": "uint8"
   }
  ],
  "name": "Joined",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "user",
    "type": "address"
   }
  ],
  "name": "Left",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "user",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "amount",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "bool",
    "name": "succeeded",
    "type": "bool"
   }
  ],
  "name": "Paid",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "host",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "address",
    "name": "token",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint96",
    "name": "stake",
    "type": "uint96"
   },
   {
    "indexed": false,
    "internalType": "uint8",
    "name": "mode",
    "type": "uint8"
   },
   {
    "indexed": false,
    "internalType": "uint32",
    "name": "duration",
    "type": "uint32"
   },
   {
    "indexed": false,
    "internalType": "uint16",
    "name": "required",
    "type": "uint16"
   },
   {
    "indexed": false,
    "internalType": "bytes32",
    "name": "metaHash",
    "type": "bytes32"
   }
  ],
  "name": "PoolCreated",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "reporter",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint8",
    "name": "side",
    "type": "uint8"
   },
   {
    "indexed": false,
    "internalType": "uint8",
    "name": "winner",
    "type": "uint8"
   }
  ],
  "name": "ResultReported",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "redistributed",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "fee",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint16",
    "name": "winners",
    "type": "uint16"
   }
  ],
  "name": "Settled",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint40",
    "name": "startAt",
    "type": "uint40"
   },
   {
    "indexed": false,
    "internalType": "uint40",
    "name": "endsAt",
    "type": "uint40"
   }
  ],
  "name": "Started",
  "type": "event"
 },
 {
  "inputs": [],
  "name": "DISPUTE_WINDOW",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "LOBBY_EXPIRY",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "MATCH_REPORT_DEADLINE",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "MAX_PARTICIPANTS",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   }
  ],
  "name": "cancel",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   },
   {
    "internalType": "bytes32",
    "name": "proofHash",
    "type": "bytes32"
   }
  ],
  "name": "checkIn",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "contract IERC20",
    "name": "token",
    "type": "address"
   },
   {
    "internalType": "uint96",
    "name": "stake",
    "type": "uint96"
   },
   {
    "internalType": "uint32",
    "name": "duration",
    "type": "uint32"
   },
   {
    "internalType": "uint16",
    "name": "feeBps",
    "type": "uint16"
   },
   {
    "internalType": "enum PromisePool.Mode",
    "name": "mode",
    "type": "uint8"
   },
   {
    "internalType": "uint16",
    "name": "required",
    "type": "uint16"
   },
   {
    "internalType": "uint16",
    "name": "maxPerSide",
    "type": "uint16"
   },
   {
    "internalType": "bytes32",
    "name": "metaHash",
    "type": "bytes32"
   },
   {
    "internalType": "address",
    "name": "verifier",
    "type": "address"
   }
  ],
  "name": "createPool",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   }
  ],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "feeRecipient",
  "outputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   },
   {
    "internalType": "uint8",
    "name": "side",
    "type": "uint8"
   }
  ],
  "name": "join",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   },
   {
    "internalType": "uint8",
    "name": "side",
    "type": "uint8"
   },
   {
    "internalType": "address",
    "name": "from",
    "type": "address"
   },
   {
    "internalType": "uint256",
    "name": "validAfter",
    "type": "uint256"
   },
   {
    "internalType": "uint256",
    "name": "validBefore",
    "type": "uint256"
   },
   {
    "internalType": "bytes32",
    "name": "nonce",
    "type": "bytes32"
   },
   {
    "internalType": "uint8",
    "name": "v",
    "type": "uint8"
   },
   {
    "internalType": "bytes32",
    "name": "r",
    "type": "bytes32"
   },
   {
    "internalType": "bytes32",
    "name": "s",
    "type": "bytes32"
   }
  ],
  "name": "joinWithAuthorization",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   }
  ],
  "name": "leave",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   },
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "name": "members",
  "outputs": [
   {
    "internalType": "bool",
    "name": "joined",
    "type": "bool"
   },
   {
    "internalType": "uint8",
    "name": "side",
    "type": "uint8"
   },
   {
    "internalType": "uint16",
    "name": "checkins",
    "type": "uint16"
   },
   {
    "internalType": "uint16",
    "name": "rejected",
    "type": "uint16"
   },
   {
    "internalType": "uint32",
    "name": "lastDay",
    "type": "uint32"
   },
   {
    "internalType": "uint16",
    "name": "index",
    "type": "uint16"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   }
  ],
  "name": "participantsOf",
  "outputs": [
   {
    "internalType": "address[]",
    "name": "",
    "type": "address[]"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "poolCount",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "name": "pools",
  "outputs": [
   {
    "internalType": "address",
    "name": "host",
    "type": "address"
   },
   {
    "internalType": "contract IERC20",
    "name": "token",
    "type": "address"
   },
   {
    "internalType": "uint96",
    "name": "stake",
    "type": "uint96"
   },
   {
    "internalType": "uint40",
    "name": "createdAt",
    "type": "uint40"
   },
   {
    "internalType": "uint40",
    "name": "startAt",
    "type": "uint40"
   },
   {
    "internalType": "uint40",
    "name": "endsAt",
    "type": "uint40"
   },
   {
    "internalType": "uint32",
    "name": "duration",
    "type": "uint32"
   },
   {
    "internalType": "uint16",
    "name": "feeBps",
    "type": "uint16"
   },
   {
    "internalType": "uint8",
    "name": "mode",
    "type": "uint8"
   },
   {
    "internalType": "uint8",
    "name": "status",
    "type": "uint8"
   },
   {
    "internalType": "uint16",
    "name": "required",
    "type": "uint16"
   },
   {
    "internalType": "uint16",
    "name": "participants",
    "type": "uint16"
   },
   {
    "internalType": "uint16",
    "name": "maxPerSide",
    "type": "uint16"
   },
   {
    "internalType": "uint16",
    "name": "countA",
    "type": "uint16"
   },
   {
    "internalType": "uint16",
    "name": "countB",
    "type": "uint16"
   },
   {
    "internalType": "bytes32",
    "name": "metaHash",
    "type": "bytes32"
   },
   {
    "internalType": "address",
    "name": "verifier",
    "type": "address"
   },
   {
    "internalType": "uint8",
    "name": "reportA",
    "type": "uint8"
   },
   {
    "internalType": "uint8",
    "name": "reportB",
    "type": "uint8"
   },
   {
    "internalType": "uint40",
    "name": "firstReportAt",
    "type": "uint40"
   },
   {
    "internalType": "uint40",
    "name": "lastReportAt",
    "type": "uint40"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   }
  ],
  "name": "potOf",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   },
   {
    "internalType": "address",
    "name": "user",
    "type": "address"
   }
  ],
  "name": "rejectCheckIn",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   },
   {
    "internalType": "uint8",
    "name": "winner",
    "type": "uint8"
   }
  ],
  "name": "reportResult",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   }
  ],
  "name": "settle",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "poolId",
    "type": "uint256"
   }
  ],
  "name": "start",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 }
] as const;
