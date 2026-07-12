// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Reputation — onchain vendor reputation, written only by Settlement.
/// @notice Aggregates settled-call outcomes per vendor. The router reads
///         `scoreOf()` when ranking auction bids.
contract Reputation {
    struct Stats {
        uint64 calls;
        uint64 successes;
        uint32 latencyEwmaMs; // exponentially weighted moving average
    }

    address public settlement;
    address public governance;
    mapping(bytes32 vendorId => Stats) public stats;

    event CallRecorded(bytes32 indexed vendorId, bool success, uint32 latencyMs);
    event SettlementUpdated(address settlement);

    error NotSettlement();
    error NotGovernance();

    constructor() {
        governance = msg.sender;
    }

    function setSettlement(address _settlement) external {
        if (msg.sender != governance) revert NotGovernance();
        settlement = _settlement;
        emit SettlementUpdated(_settlement);
    }

    function recordCall(bytes32 vendorId, bool success, uint32 latencyMs) external {
        if (msg.sender != settlement) revert NotSettlement();
        Stats storage s = stats[vendorId];
        s.calls += 1;
        if (success) s.successes += 1;
        // EWMA with alpha = 1/20
        s.latencyEwmaMs = s.latencyEwmaMs == 0
            ? latencyMs
            : uint32((uint256(s.latencyEwmaMs) * 19 + latencyMs) / 20);
        emit CallRecorded(vendorId, success, latencyMs);
    }

    /// @return score 0–10000 basis points (e.g. 9840 = 98.40)
    function scoreOf(bytes32 vendorId) external view returns (uint256 score) {
        Stats storage s = stats[vendorId];
        if (s.calls == 0) return 5000; // neutral prior
        uint256 successBps = (uint256(s.successes) * 10000) / s.calls;
        uint256 latencyBps = s.latencyEwmaMs >= 2000
            ? 0
            : ((2000 - uint256(s.latencyEwmaMs)) * 10000) / 2000;
        // 80% success rate, 20% latency consistency
        return (successBps * 8 + latencyBps * 2) / 10;
    }
}
