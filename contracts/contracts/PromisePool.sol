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

/// @title PromisePool — commitment pools and skill-tournament pools with real money.
/// @notice One contract, many pools. Two resolution modes:
///   PROMISE: every participant competes against themselves. Those who reach the required
///            number of valid check-ins keep their stake and split the stakes of those who did not.
///   MATCH:   two sides. The winning side splits the pool. Only players stake (no spectators).
///            Resolved when a member of each side reports the same winner, or by the host after
///            the dispute window if the other side never reports. Conflicting reports => refund.
/// @dev Non-custodial: funds only ever move between participants (minus an optional fee that is
///      charged only on the amount actually redistributed). No token, no yield, no fiat.
contract PromisePool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Mode { PROMISE, MATCH }
    enum Status { OPEN, SETTLED, CANCELLED }

    struct Pool {
        address host;
        IERC20 token;
        uint96 stake;           // per participant, token units
        uint40 joinUntil;       // joins allowed until this timestamp
        uint40 endsAt;          // promise end / match time; settlement allowed after this
        uint16 feeBps;          // charged only on redistributed amount
        uint8 mode;             // Mode
        uint8 status;           // Status
        uint16 required;        // PROMISE: valid check-ins needed to succeed
        uint16 participants;    // count
        bytes32 metaHash;       // keccak of offchain metadata (title, rules, proof type)
        address verifier;       // PROMISE: may reject check-ins (host by default)
        uint8 reportedWinner;   // MATCH: 0 none, 1 side A, 2 side B, 3 conflict
        uint8 reportsMask;      // MATCH: bit0 = side A reported, bit1 = side B reported
        uint40 firstReportAt;   // MATCH: when the first report landed
    }

    struct Member {
        bool joined;
        uint8 side;             // MATCH: 1 or 2. PROMISE: 0
        uint16 checkins;        // PROMISE: valid check-ins so far
        uint16 rejected;        // PROMISE: rejected check-ins (for the record)
    }

    uint256 public constant MAX_PARTICIPANTS = 64;
    uint256 public constant DISPUTE_WINDOW = 24 hours;

    address public immutable feeRecipient;
    uint256 public poolCount;

    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => Member)) public members;
    mapping(uint256 => address[]) private _participants;

    event PoolCreated(uint256 indexed poolId, address indexed host, address token, uint96 stake, uint8 mode, uint40 joinUntil, uint40 endsAt, uint16 required, bytes32 metaHash);
    event Joined(uint256 indexed poolId, address indexed user, uint8 side);
    event CheckedIn(uint256 indexed poolId, address indexed user, uint16 count, bytes32 proofHash);
    event CheckInRejected(uint256 indexed poolId, address indexed user, uint16 count);
    event ResultReported(uint256 indexed poolId, address indexed reporter, uint8 side, uint8 winner);
    event Paid(uint256 indexed poolId, address indexed user, uint256 amount, bool succeeded);
    event Settled(uint256 indexed poolId, uint256 redistributed, uint256 fee, uint16 winners);
    event Cancelled(uint256 indexed poolId);

    error BadParams();
    error NotOpen();
    error JoinClosed();
    error AlreadyJoined();
    error NotMember();
    error TooEarly();
    error NotHost();
    error NotVerifier();
    error WrongMode();
    error Full();

    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
    }

    // ---------------------------------------------------------------- create

    function createPool(
        IERC20 token,
        uint96 stake,
        uint40 joinUntil,
        uint40 endsAt,
        uint16 feeBps,
        Mode mode,
        uint16 required,
        bytes32 metaHash,
        address verifier
    ) external returns (uint256 poolId) {
        if (stake == 0 || joinUntil > endsAt || endsAt <= block.timestamp || feeBps > 1000) revert BadParams();
        if (mode == Mode.PROMISE && required == 0) revert BadParams();
        poolId = ++poolCount;
        Pool storage p = pools[poolId];
        p.host = msg.sender;
        p.token = token;
        p.stake = stake;
        p.joinUntil = joinUntil;
        p.endsAt = endsAt;
        p.feeBps = feeBps;
        p.mode = uint8(mode);
        p.required = required;
        p.metaHash = metaHash;
        p.verifier = verifier == address(0) ? msg.sender : verifier;
        emit PoolCreated(poolId, msg.sender, address(token), stake, uint8(mode), joinUntil, endsAt, required, metaHash);
    }

    // ---------------------------------------------------------------- join

    /// @notice Join paying from an existing allowance (user pays gas).
    function join(uint256 poolId, uint8 side) external nonReentrant {
        Pool storage p = _joinable(poolId, side);
        p.token.safeTransferFrom(msg.sender, address(this), p.stake);
        _record(poolId, p, msg.sender, side);
    }

    /// @notice Join with an EIP-3009 authorization signed by `from`; anyone (a relayer) may
    ///         submit it and pay the gas. The authorization must name this contract as `to`.
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
        Pool storage p = _joinableFor(poolId, side, from);
        uint256 before = p.token.balanceOf(address(this));
        IERC3009(address(p.token)).receiveWithAuthorization(from, address(this), p.stake, validAfter, validBefore, nonce, v, r, s);
        if (p.token.balanceOf(address(this)) - before != p.stake) revert BadParams();
        _record(poolId, p, from, side);
    }

    function _joinable(uint256 poolId, uint8 side) private view returns (Pool storage p) {
        return _joinableFor(poolId, side, msg.sender);
    }

    function _joinableFor(uint256 poolId, uint8 side, address who) private view returns (Pool storage p) {
        p = pools[poolId];
        if (p.status != uint8(Status.OPEN)) revert NotOpen();
        if (block.timestamp > p.joinUntil) revert JoinClosed();
        if (members[poolId][who].joined) revert AlreadyJoined();
        if (p.participants >= MAX_PARTICIPANTS) revert Full();
        if (p.mode == uint8(Mode.MATCH)) { if (side != 1 && side != 2) revert BadParams(); }
        else if (side != 0) revert BadParams();
    }

    function _record(uint256 poolId, Pool storage p, address who, uint8 side) private {
        Member storage m = members[poolId][who];
        m.joined = true;
        m.side = side;
        _participants[poolId].push(who);
        p.participants += 1;
        emit Joined(poolId, who, side);
    }

    // ---------------------------------------------------------------- PROMISE mode

    /// @notice Record a check-in. `proofHash` commits to the offchain proof (photo, API record).
    function checkIn(uint256 poolId, bytes32 proofHash) external {
        Pool storage p = pools[poolId];
        if (p.mode != uint8(Mode.PROMISE)) revert WrongMode();
        if (p.status != uint8(Status.OPEN)) revert NotOpen();
        Member storage m = members[poolId][msg.sender];
        if (!m.joined) revert NotMember();
        m.checkins += 1;
        emit CheckedIn(poolId, msg.sender, m.checkins, proofHash);
    }

    /// @notice Verifier (host or AI service) rejects one check-in of `user`.
    function rejectCheckIn(uint256 poolId, address user) external {
        Pool storage p = pools[poolId];
        if (msg.sender != p.verifier && msg.sender != p.host) revert NotVerifier();
        if (p.status != uint8(Status.OPEN)) revert NotOpen();
        Member storage m = members[poolId][user];
        if (!m.joined || m.checkins == 0) revert NotMember();
        m.checkins -= 1;
        m.rejected += 1;
        emit CheckInRejected(poolId, user, m.checkins);
    }

    // ---------------------------------------------------------------- MATCH mode

    /// @notice A player reports which side won. Finalizes when both sides agree.
    function reportResult(uint256 poolId, uint8 winner) external {
        Pool storage p = pools[poolId];
        if (p.mode != uint8(Mode.MATCH)) revert WrongMode();
        if (p.status != uint8(Status.OPEN)) revert NotOpen();
        if (winner != 1 && winner != 2) revert BadParams();
        Member storage m = members[poolId][msg.sender];
        if (!m.joined) revert NotMember();
        uint8 bit = m.side == 1 ? 1 : 2;
        if (p.reportsMask & bit != 0) revert AlreadyJoined(); // this side already reported
        if (p.reportedWinner == 0) { p.reportedWinner = winner; p.firstReportAt = uint40(block.timestamp); }
        else if (p.reportedWinner != winner) { p.reportedWinner = 3; }
        p.reportsMask |= bit;
        emit ResultReported(poolId, msg.sender, m.side, p.reportedWinner);
    }

    // ---------------------------------------------------------------- settle

    /// @notice Pay everyone out. Anyone can call once the pool can be resolved.
    function settle(uint256 poolId) external nonReentrant {
        Pool storage p = pools[poolId];
        if (p.status != uint8(Status.OPEN)) revert NotOpen();
        address[] storage list = _participants[poolId];
        uint256 n = list.length;

        // Decide winners.
        bool[] memory won = new bool[](n);
        uint16 winners;
        if (p.mode == uint8(Mode.PROMISE)) {
            if (block.timestamp < p.endsAt) revert TooEarly();
            for (uint256 i; i < n; ++i) {
                if (members[poolId][list[i]].checkins >= p.required) { won[i] = true; ++winners; }
            }
        } else {
            uint8 w = p.reportedWinner;
            bool bothAgree = (p.reportsMask == 3 && w != 3);
            bool oneSideTimedOut = (p.reportsMask != 0 && p.reportsMask != 3 && w != 3 && block.timestamp >= p.firstReportAt + DISPUTE_WINDOW);
            if (!(bothAgree || oneSideTimedOut)) {
                // conflict, or nobody reported long after the match: refund everyone
                if (w == 3 || block.timestamp >= p.endsAt + 7 days) { _refundAll(poolId, p, list); return; }
                revert TooEarly();
            }
            for (uint256 i; i < n; ++i) {
                if (members[poolId][list[i]].side == w) { won[i] = true; ++winners; }
            }
        }

        // Nobody won (or everybody did): no redistribution, everyone gets their stake back.
        if (winners == 0 || winners == n) { _refundAll(poolId, p, list); return; }

        uint256 losersPot = uint256(p.stake) * (n - winners);
        uint256 fee = losersPot * p.feeBps / 10_000;
        uint256 share = (losersPot - fee) / winners;
        uint256 dust = (losersPot - fee) - share * winners; // rounding leftover joins the fee

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

    /// @notice Host cancels before anyone joined, or before the end if everyone must be refunded.
    function cancel(uint256 poolId) external nonReentrant {
        Pool storage p = pools[poolId];
        if (msg.sender != p.host) revert NotHost();
        if (p.status != uint8(Status.OPEN)) revert NotOpen();
        if (block.timestamp > p.joinUntil && p.participants > 1) revert TooEarly(); // committed pools can't be cancelled
        _refundAll(poolId, p, _participants[poolId]);
    }

    function _refundAll(uint256 poolId, Pool storage p, address[] storage list) private {
        p.status = uint8(Status.CANCELLED);
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
