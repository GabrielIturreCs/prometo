// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev Subset of EIP-3009 implemented by AUSD (Agora) and USDC: lets a user authorize a
///      transfer with a signature so a relayer can pay the gas. Users never need MON.
interface IERC3009 {
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

/// @title PromisePool — commitment pools and friendly challenges with real money.
/// @notice Lifecycle: LOBBY (people join and can leave with a refund) -> ACTIVE (the host starts it)
///         -> SETTLED or CANCELLED.
///   PROMISE: everyone competes against themselves. One check-in per day. Those who reach the
///            required number of check-ins keep their stake and split the stakes of those who did not.
///   MATCH:   two sides, only players stake. The result counts when both sides report the same
///            winner (a side may change its report until they agree). If only one side reports,
///            that report stands after 24 h. If they still disagree 24 h after the last report,
///            everyone is refunded. Every player of the winning side gets their stake back plus an
///            equal share of the losing side's stakes.
/// @dev Non-custodial: funds only move between participants, plus an optional fee charged only on
///      the redistributed amount. No token, no yield, no fiat, no admin withdrawal.
contract PromisePool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Mode { PROMISE, MATCH }
    enum Status { LOBBY, ACTIVE, SETTLED, CANCELLED }

    struct Pool {
        address host;
        IERC20 token;
        uint96 stake;           // per participant, token units
        uint40 createdAt;
        uint40 startAt;         // set by start()
        uint40 endsAt;          // startAt + duration
        uint32 duration;        // seconds the promise / match lasts once started
        uint16 feeBps;          // charged only on the redistributed amount
        uint8 mode;             // Mode
        uint8 status;           // Status
        uint16 required;        // PROMISE: daily check-ins needed to succeed
        uint16 participants;
        uint16 maxPerSide;      // MATCH: 0 = unlimited (e.g. 5 for 5 vs 5)
        uint16 countA;          // MATCH: players on side 1
        uint16 countB;          // MATCH: players on side 2
        bytes32 metaHash;       // keccak of offchain metadata (title, rules, side names)
        address verifier;       // PROMISE: may reject check-ins (host by default)
        uint8 reportA;          // MATCH: winner reported by side 1 (0 = none)
        uint8 reportB;          // MATCH: winner reported by side 2 (0 = none)
        uint40 firstReportAt;
        uint40 lastReportAt;
    }

    struct Member {
        bool joined;
        uint8 side;             // MATCH: 1 or 2. PROMISE: 0
        uint16 checkins;
        uint16 rejected;
        uint32 lastDay;         // 1 + day index of the last check-in (0 = never)
        uint16 index;           // position in the participants list + 1
    }

    uint256 public constant MAX_PARTICIPANTS = 64;
    uint256 public constant DISPUTE_WINDOW = 24 hours;
    uint256 public constant LOBBY_EXPIRY = 7 days;
    uint256 public constant MATCH_REPORT_DEADLINE = 7 days;

    address public immutable feeRecipient;
    uint256 public poolCount;

    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => Member)) public members;
    mapping(uint256 => address[]) private _participants;

    event PoolCreated(uint256 indexed poolId, address indexed host, address token, uint96 stake, uint8 mode, uint32 duration, uint16 required, bytes32 metaHash);
    event Joined(uint256 indexed poolId, address indexed user, uint8 side);
    event Left(uint256 indexed poolId, address indexed user);
    event Started(uint256 indexed poolId, uint40 startAt, uint40 endsAt);
    event CheckedIn(uint256 indexed poolId, address indexed user, uint16 count, bytes32 proofHash);
    event CheckInRejected(uint256 indexed poolId, address indexed user, uint16 count);
    event ResultReported(uint256 indexed poolId, address indexed reporter, uint8 side, uint8 winner);
    event Paid(uint256 indexed poolId, address indexed user, uint256 amount, bool succeeded);
    event Settled(uint256 indexed poolId, uint256 redistributed, uint256 fee, uint16 winners);
    event Cancelled(uint256 indexed poolId);

    error BadParams();
    error WrongStatus();
    error AlreadyJoined();
    error NotMember();
    error TooEarly();
    error NotHost();
    error NotVerifier();
    error WrongMode();
    error Full();
    error NotEnoughPlayers();
    error AlreadyCheckedInToday();
    error PromiseEnded();

    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
    }

    // ---------------------------------------------------------------- create & lobby

    function createPool(
        IERC20 token,
        uint96 stake,
        uint32 duration,
        uint16 feeBps,
        Mode mode,
        uint16 required,
        uint16 maxPerSide,
        bytes32 metaHash,
        address verifier
    ) external returns (uint256 poolId) {
        if (stake == 0 || duration == 0 || duration > 366 days || feeBps > 1000) revert BadParams();
        if (mode == Mode.PROMISE && (required == 0 || uint256(required) > (uint256(duration) + 1 days - 1) / 1 days)) revert BadParams();
        poolId = ++poolCount;
        Pool storage p = pools[poolId];
        p.host = msg.sender;
        p.token = token;
        p.stake = stake;
        p.createdAt = uint40(block.timestamp);
        p.duration = duration;
        p.feeBps = feeBps;
        p.mode = uint8(mode);
        p.required = required;
        p.maxPerSide = maxPerSide;
        p.metaHash = metaHash;
        p.verifier = verifier == address(0) ? msg.sender : verifier;
        emit PoolCreated(poolId, msg.sender, address(token), stake, uint8(mode), duration, required, metaHash);
    }

    /// @notice Join paying from an existing allowance (user pays gas).
    function join(uint256 poolId, uint8 side) external nonReentrant {
        Pool storage p = _checkJoin(poolId, side, msg.sender);
        p.token.safeTransferFrom(msg.sender, address(this), p.stake);
        _record(poolId, p, msg.sender, side);
    }

    /// @notice Join with an EIP-3009 authorization signed by `from`; anyone (a relayer) may submit
    ///         it and pay the gas. The authorization can only move exactly `stake` into this contract.
    function joinWithAuthorization(
        uint256 poolId,
        uint8 side,
        address from,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        Pool storage p = _checkJoin(poolId, side, from);
        uint256 before = p.token.balanceOf(address(this));
        IERC3009(address(p.token)).receiveWithAuthorization(from, address(this), p.stake, validAfter, validBefore, nonce, v, r, s);
        if (p.token.balanceOf(address(this)) - before != p.stake) revert BadParams();
        _record(poolId, p, from, side);
    }

    function _checkJoin(uint256 poolId, uint8 side, address who) private view returns (Pool storage p) {
        p = pools[poolId];
        if (p.host == address(0) || p.status != uint8(Status.LOBBY)) revert WrongStatus();
        if (members[poolId][who].joined) revert AlreadyJoined();
        if (p.participants >= MAX_PARTICIPANTS) revert Full();
        if (p.mode == uint8(Mode.MATCH)) {
            if (side != 1 && side != 2) revert BadParams();
            if (p.maxPerSide != 0 && (side == 1 ? p.countA : p.countB) >= p.maxPerSide) revert Full();
        } else if (side != 0) revert BadParams();
    }

    function _record(uint256 poolId, Pool storage p, address who, uint8 side) private {
        _participants[poolId].push(who);
        Member storage m = members[poolId][who];
        m.joined = true;
        m.side = side;
        m.index = uint16(_participants[poolId].length);
        p.participants += 1;
        if (side == 1) p.countA += 1; else if (side == 2) p.countB += 1;
        emit Joined(poolId, who, side);
    }

    /// @notice Leave before the start and get your stake back.
    function leave(uint256 poolId) external nonReentrant {
        Pool storage p = pools[poolId];
        if (p.status != uint8(Status.LOBBY)) revert WrongStatus();
        Member storage m = members[poolId][msg.sender];
        if (!m.joined) revert NotMember();
        address[] storage list = _participants[poolId];
        uint256 i = m.index - 1;
        address last = list[list.length - 1];
        list[i] = last;
        members[poolId][last].index = uint16(i + 1);
        list.pop();
        p.participants -= 1;
        if (m.side == 1) p.countA -= 1; else if (m.side == 2) p.countB -= 1;
        delete members[poolId][msg.sender];
        p.token.safeTransfer(msg.sender, p.stake);
        emit Left(poolId, msg.sender);
    }

    /// @notice The host starts the promise or the match once enough people are in.
    function start(uint256 poolId) external {
        Pool storage p = pools[poolId];
        if (msg.sender != p.host) revert NotHost();
        if (p.status != uint8(Status.LOBBY)) revert WrongStatus();
        if (p.mode == uint8(Mode.PROMISE) ? p.participants < 2 : (p.countA == 0 || p.countB == 0)) revert NotEnoughPlayers();
        p.status = uint8(Status.ACTIVE);
        p.startAt = uint40(block.timestamp);
        p.endsAt = uint40(block.timestamp + p.duration);
        emit Started(poolId, p.startAt, p.endsAt);
    }

    /// @notice The host cancels from the lobby, or anyone does once the lobby has expired.
    function cancel(uint256 poolId) external nonReentrant {
        Pool storage p = pools[poolId];
        if (p.status != uint8(Status.LOBBY)) revert WrongStatus();
        if (msg.sender != p.host && block.timestamp < p.createdAt + LOBBY_EXPIRY) revert NotHost();
        _refundAll(poolId, p);
    }

    // ---------------------------------------------------------------- PROMISE mode

    /// @notice Record today's check-in. `proofHash` commits to the offchain proof (photo hash).
    function checkIn(uint256 poolId, bytes32 proofHash) external {
        Pool storage p = pools[poolId];
        if (p.mode != uint8(Mode.PROMISE)) revert WrongMode();
        if (p.status != uint8(Status.ACTIVE)) revert WrongStatus();
        Member storage m = members[poolId][msg.sender];
        if (!m.joined) revert NotMember();
        if (block.timestamp >= p.endsAt) revert PromiseEnded();
        // one check-in per day, counted in 24 h windows from the start
        uint32 day = uint32((block.timestamp - p.startAt) / 1 days) + 1;
        if (m.lastDay == day) revert AlreadyCheckedInToday();
        m.lastDay = day;
        m.checkins += 1;
        emit CheckedIn(poolId, msg.sender, m.checkins, proofHash);
    }

    /// @notice Verifier (host by default) rejects one check-in of `user`.
    function rejectCheckIn(uint256 poolId, address user) external {
        Pool storage p = pools[poolId];
        if (msg.sender != p.verifier && msg.sender != p.host) revert NotVerifier();
        if (p.status != uint8(Status.ACTIVE)) revert WrongStatus();
        Member storage m = members[poolId][user];
        if (!m.joined || m.checkins == 0) revert NotMember();
        m.checkins -= 1;
        m.rejected += 1;
        emit CheckInRejected(poolId, user, m.checkins);
    }

    // ---------------------------------------------------------------- MATCH mode

    /// @notice A player reports which side won, on behalf of their side. A side can change its
    ///         report until both sides agree (e.g. after a mistaken tap).
    function reportResult(uint256 poolId, uint8 winner) external {
        Pool storage p = pools[poolId];
        if (p.mode != uint8(Mode.MATCH)) revert WrongMode();
        if (p.status != uint8(Status.ACTIVE)) revert WrongStatus();
        if (winner != 1 && winner != 2) revert BadParams();
        Member storage m = members[poolId][msg.sender];
        if (!m.joined) revert NotMember();
        if (p.reportA != 0 && p.reportA == p.reportB) revert WrongStatus(); // already agreed
        if (m.side == 1) p.reportA = winner; else p.reportB = winner;
        if (p.firstReportAt == 0) p.firstReportAt = uint40(block.timestamp);
        p.lastReportAt = uint40(block.timestamp);
        emit ResultReported(poolId, msg.sender, m.side, winner);
    }

    // ---------------------------------------------------------------- settle

    /// @notice Pay everyone out. Anyone can call once the pool can be resolved.
    function settle(uint256 poolId) external nonReentrant {
        Pool storage p = pools[poolId];
        if (p.status != uint8(Status.ACTIVE)) revert WrongStatus();
        address[] storage list = _participants[poolId];
        uint256 n = list.length;

        bool[] memory won = new bool[](n);
        uint16 winners;
        if (p.mode == uint8(Mode.PROMISE)) {
            if (block.timestamp < p.endsAt) revert TooEarly();
            for (uint256 i; i < n; ++i) {
                if (members[poolId][list[i]].checkins >= p.required) { won[i] = true; ++winners; }
            }
        } else {
            uint8 w;
            if (p.reportA != 0 && p.reportA == p.reportB) {
                w = p.reportA;                                                  // both sides agree
            } else if ((p.reportA == 0) != (p.reportB == 0)) {
                if (block.timestamp < p.firstReportAt + DISPUTE_WINDOW) revert TooEarly();
                w = p.reportA != 0 ? p.reportA : p.reportB;                     // other side silent
            } else if (p.reportA != 0) {
                if (block.timestamp < p.lastReportAt + DISPUTE_WINDOW) revert TooEarly();
                _refundAll(poolId, p); return;                                  // still disagree
            } else {
                if (block.timestamp < p.startAt + MATCH_REPORT_DEADLINE) revert TooEarly();
                _refundAll(poolId, p); return;                                  // nobody reported
            }
            for (uint256 i; i < n; ++i) {
                if (members[poolId][list[i]].side == w) { won[i] = true; ++winners; }
            }
        }

        if (winners == 0 || winners == n) { _refundAll(poolId, p); return; }

        uint256 losersPot = uint256(p.stake) * (n - winners);
        uint256 fee = losersPot * p.feeBps / 10_000;
        uint256 share = (losersPot - fee) / winners;
        uint256 dust = (losersPot - fee) - share * winners;

        p.status = uint8(Status.SETTLED);
        for (uint256 i; i < n; ++i) {
            if (won[i]) {
                uint256 amt = uint256(p.stake) + share;
                p.token.safeTransfer(list[i], amt);
                emit Paid(poolId, list[i], amt, true);
            } else {
                emit Paid(poolId, list[i], 0, false);
            }
        }
        if (fee + dust > 0) p.token.safeTransfer(feeRecipient, fee + dust);
        emit Settled(poolId, losersPot, fee + dust, winners);
    }

    function _refundAll(uint256 poolId, Pool storage p) private {
        p.status = uint8(Status.CANCELLED);
        address[] storage list = _participants[poolId];
        for (uint256 i; i < list.length; ++i) {
            p.token.safeTransfer(list[i], p.stake);
            emit Paid(poolId, list[i], p.stake, true);
        }
        emit Cancelled(poolId);
    }

    // ---------------------------------------------------------------- views

    function participantsOf(uint256 poolId) external view returns (address[] memory) {
        return _participants[poolId];
    }

    function potOf(uint256 poolId) external view returns (uint256) {
        Pool storage p = pools[poolId];
        return uint256(p.stake) * p.participants;
    }
}
