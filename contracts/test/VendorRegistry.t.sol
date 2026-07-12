// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {VendorRegistry} from "../src/VendorRegistry.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";

contract VendorRegistryTest is Test {
    MockUSDG usdg;
    VendorRegistry registry;
    address vendorOwner = makeAddr("vendorOwner");
    bytes32 constant PLEIADES = keccak256("pleiades");

    function setUp() public {
        usdg = new MockUSDG();
        registry = new VendorRegistry(IERC20(address(usdg)), 500e6);
        usdg.mint(vendorOwner, 1000e6);
        vm.prank(vendorOwner);
        usdg.approve(address(registry), type(uint256).max);
    }

    function _register() internal {
        bytes32[] memory caps = new bytes32[](1);
        caps[0] = keccak256("execute_swap");
        vm.prank(vendorOwner);
        registry.register(PLEIADES, keccak256("https://quote.pleiades.xyz"), caps, 500e6);
    }

    function test_registerWithStake() public {
        _register();
        assertTrue(registry.isActive(PLEIADES));
        assertEq(registry.vendorCount(), 1);
        assertEq(usdg.balanceOf(address(registry)), 500e6);
    }

    function test_register_revertsBelowMinStake() public {
        bytes32[] memory caps = new bytes32[](0);
        vm.prank(vendorOwner);
        vm.expectRevert(VendorRegistry.StakeTooLow.selector);
        registry.register(PLEIADES, bytes32(0), caps, 1e6);
    }

    function test_exitCooldown_thenStakeReturned() public {
        _register();
        vm.prank(vendorOwner);
        registry.requestExit(PLEIADES);
        assertFalse(registry.isActive(PLEIADES));

        vm.prank(vendorOwner);
        vm.expectRevert(VendorRegistry.CooldownActive.selector);
        registry.deregister(PLEIADES);

        vm.warp(block.timestamp + 3 days);
        vm.prank(vendorOwner);
        registry.deregister(PLEIADES);
        assertEq(usdg.balanceOf(vendorOwner), 1000e6);
    }

    function test_slash_onlyGovernance() public {
        _register();
        vm.prank(vendorOwner);
        vm.expectRevert(VendorRegistry.NotGovernance.selector);
        registry.slash(PLEIADES, 100e6, "bad quotes");

        registry.slash(PLEIADES, 100e6, "bad quotes"); // test contract is governance
        (, , uint256 stake, ,) = _vendorTuple();
        assertEq(stake, 400e6);
    }

    function _vendorTuple() internal view returns (address, bytes32, uint256, uint64, uint64) {
        (address owner, bytes32 ep, uint256 stake, uint64 reg, uint64 exit) = registry.vendors(PLEIADES);
        return (owner, ep, stake, reg, exit);
    }
}
