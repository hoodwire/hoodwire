// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice An ERC20 that can report failure by returning false instead of reverting —
///         legal under the standard, and common enough that escrow must never trust a bare
///         call. Each leg fails independently so both transfer paths can be tested.
contract SilentFailUSDG {
    mapping(address => uint256) public balanceOf;
    bool public failTransfer;
    bool public failTransferFrom;
    uint8 public constant decimals = 6;

    function setFail(bool transferFails, bool transferFromFails) external {
        failTransfer = transferFails;
        failTransferFrom = transferFromFails;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address, uint256) external pure returns (bool) {
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (failTransfer) return false;
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (failTransferFrom) return false;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
