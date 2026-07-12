// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";

/// @title VendorRegistry — permissionless registration of routing vendors.
/// @notice Vendors stake USDG to appear in the auction set. Governance can slash
///         provably misbehaving vendors; anyone can deregister after a cooldown.
contract VendorRegistry {
    struct Vendor {
        address owner;
        bytes32 endpointHash;     // hash of the vendor's off-chain quote endpoint
        bytes32[] capabilities;   // e.g. keccak256("execute_swap")
        uint256 stake;            // USDG (6 decimals)
        uint64 registeredAt;
        uint64 exitRequestedAt;   // 0 = active
    }

    IERC20 public immutable usdg;
    address public governance;
    uint256 public minStake;              // e.g. 500e6 = 500 USDG
    uint64 public constant EXIT_COOLDOWN = 3 days;

    mapping(bytes32 vendorId => Vendor) public vendors;
    bytes32[] public vendorIds;

    event VendorRegistered(bytes32 indexed vendorId, address indexed owner, uint256 stake);
    event VendorExitRequested(bytes32 indexed vendorId, uint64 at);
    event VendorDeregistered(bytes32 indexed vendorId, uint256 stakeReturned);
    event VendorSlashed(bytes32 indexed vendorId, uint256 amount, string reason);

    error NotGovernance();
    error NotVendorOwner();
    error StakeTooLow();
    error AlreadyRegistered();
    error UnknownVendor();
    error ExitNotRequested();
    error CooldownActive();

    modifier onlyGovernance() {
        if (msg.sender != governance) revert NotGovernance();
        _;
    }

    constructor(IERC20 _usdg, uint256 _minStake) {
        usdg = _usdg;
        minStake = _minStake;
        governance = msg.sender;
    }

    function register(bytes32 vendorId, bytes32 endpointHash, bytes32[] calldata capabilities, uint256 stake)
        external
    {
        if (stake < minStake) revert StakeTooLow();
        if (vendors[vendorId].owner != address(0)) revert AlreadyRegistered();

        usdg.transferFrom(msg.sender, address(this), stake);
        vendors[vendorId] = Vendor({
            owner: msg.sender,
            endpointHash: endpointHash,
            capabilities: capabilities,
            stake: stake,
            registeredAt: uint64(block.timestamp),
            exitRequestedAt: 0
        });
        vendorIds.push(vendorId);
        emit VendorRegistered(vendorId, msg.sender, stake);
    }

    function requestExit(bytes32 vendorId) external {
        Vendor storage v = vendors[vendorId];
        if (v.owner == address(0)) revert UnknownVendor();
        if (v.owner != msg.sender) revert NotVendorOwner();
        v.exitRequestedAt = uint64(block.timestamp);
        emit VendorExitRequested(vendorId, v.exitRequestedAt);
    }

    function deregister(bytes32 vendorId) external {
        Vendor storage v = vendors[vendorId];
        if (v.owner == address(0)) revert UnknownVendor();
        if (v.owner != msg.sender) revert NotVendorOwner();
        if (v.exitRequestedAt == 0) revert ExitNotRequested();
        if (block.timestamp < v.exitRequestedAt + EXIT_COOLDOWN) revert CooldownActive();

        uint256 stake = v.stake;
        delete vendors[vendorId];
        usdg.transfer(msg.sender, stake);
        emit VendorDeregistered(vendorId, stake);
    }

    function slash(bytes32 vendorId, uint256 amount, string calldata reason) external onlyGovernance {
        Vendor storage v = vendors[vendorId];
        if (v.owner == address(0)) revert UnknownVendor();
        uint256 cut = amount > v.stake ? v.stake : amount;
        v.stake -= cut;
        usdg.transfer(governance, cut);
        emit VendorSlashed(vendorId, cut, reason);
    }

    function isActive(bytes32 vendorId) external view returns (bool) {
        Vendor storage v = vendors[vendorId];
        return v.owner != address(0) && v.exitRequestedAt == 0 && v.stake >= minStake;
    }

    function capabilitiesOf(bytes32 vendorId) external view returns (bytes32[] memory) {
        return vendors[vendorId].capabilities;
    }

    function vendorCount() external view returns (uint256) {
        return vendorIds.length;
    }
}
