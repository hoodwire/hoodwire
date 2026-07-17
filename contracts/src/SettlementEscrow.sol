// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {Reputation} from "./Reputation.sol";

/// @title SettlementEscrow — per-request USDG payment for agent capability calls.
/// @notice Users deposit USDG; the gateway operator charges per settled call,
///         paying the vendor and a protocol fee, then reports to Reputation.
///         Users can withdraw the remaining balance at any time — no lock-up.
contract SettlementEscrow {
    struct UserConfig {
        uint128 dailyLimit;   // USDG (6d). 0 = unlimited
        uint128 spentToday;
        uint64 day;           // block.timestamp / 1 days
    }

    IERC20 public immutable usdg;
    Reputation public immutable reputation;
    address public governance;
    address public operator;      // the Hoodwire gateway
    address public feeRecipient;
    uint16 public protocolFeeBps; // e.g. 500 = 5% of each call fee

    mapping(address user => uint256) public balances;
    mapping(address user => UserConfig) public configs;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Charged(
        address indexed user,
        bytes32 indexed vendorId,
        address vendorPayout,
        uint256 fee,
        uint256 protocolCut,
        bool success,
        uint32 latencyMs
    );
    event DailyLimitSet(address indexed user, uint128 limit);

    error NotGovernance();
    error NotOperator();
    error InsufficientBalance();
    error DailyLimitExceeded();
    error ZeroAddress();
    error TransferFailed();

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    constructor(IERC20 _usdg, Reputation _reputation, address _operator, address _feeRecipient, uint16 _feeBps) {
        if (_operator == address(0) || _feeRecipient == address(0)) revert ZeroAddress();
        usdg = _usdg;
        reputation = _reputation;
        governance = msg.sender;
        operator = _operator;
        feeRecipient = _feeRecipient;
        protocolFeeBps = _feeBps;
    }

    // ---------- token transfers ----------

    /// @dev Treat a token call as successful only if it neither reverted nor returned false.
    ///      Tokens that return nothing on success (USDT-style) are accepted. Ignoring this
    ///      would let a non-reverting token credit balances without moving any USDG.
    function _check(bool ok, bytes memory data) private pure {
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _pull(address from, uint256 amount) private {
        (bool ok, bytes memory data) =
            address(usdg).call(abi.encodeCall(IERC20.transferFrom, (from, address(this), amount)));
        _check(ok, data);
    }

    function _push(address to, uint256 amount) private {
        (bool ok, bytes memory data) = address(usdg).call(abi.encodeCall(IERC20.transfer, (to, amount)));
        _check(ok, data);
    }

    // ---------- user ----------

    function deposit(uint256 amount) external {
        _pull(msg.sender, amount);
        balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    /// @notice Withdraw anytime, no lock-up.
    function withdraw(uint256 amount) external {
        if (balances[msg.sender] < amount) revert InsufficientBalance();
        balances[msg.sender] -= amount;
        _push(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function setDailyLimit(uint128 limit) external {
        configs[msg.sender].dailyLimit = limit;
        emit DailyLimitSet(msg.sender, limit);
    }

    // ---------- operator ----------

    /// @notice Charge a settled capability call: pay the vendor, take protocol fee,
    ///         enforce the user's onchain daily limit, and report to Reputation.
    function charge(
        address user,
        bytes32 vendorId,
        address vendorPayout,
        uint256 fee,
        bool success,
        uint32 latencyMs
    ) external onlyOperator {
        if (balances[user] < fee) revert InsufficientBalance();

        UserConfig storage c = configs[user];
        uint64 today = uint64(block.timestamp / 1 days);
        if (c.day != today) {
            c.day = today;
            c.spentToday = 0;
        }
        if (c.dailyLimit != 0 && uint256(c.spentToday) + fee > c.dailyLimit) {
            revert DailyLimitExceeded();
        }
        c.spentToday += uint128(fee);

        balances[user] -= fee;
        uint256 protocolCut = (fee * protocolFeeBps) / 10000;
        _push(feeRecipient, protocolCut);
        _push(vendorPayout, fee - protocolCut);

        reputation.recordCall(vendorId, success, latencyMs);
        emit Charged(user, vendorId, vendorPayout, fee, protocolCut, success, latencyMs);
    }

    // ---------- governance ----------

    function setOperator(address _operator) external {
        if (msg.sender != governance) revert NotGovernance();
        if (_operator == address(0)) revert ZeroAddress();
        operator = _operator;
    }
}
