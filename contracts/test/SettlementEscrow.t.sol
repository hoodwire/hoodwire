// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {SilentFailUSDG} from "../src/mocks/SilentFailUSDG.sol";
import {Reputation} from "../src/Reputation.sol";
import {SettlementEscrow} from "../src/SettlementEscrow.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";

contract SettlementEscrowTest is Test {
    MockUSDG usdg;
    Reputation rep;
    SettlementEscrow escrow;

    address user = makeAddr("user");
    address vendor = makeAddr("vendor");
    address operator = makeAddr("operator");
    address feeRecipient = makeAddr("fees");

    bytes32 constant UNISWAP = keccak256("uniswap-v3");

    function setUp() public {
        usdg = new MockUSDG();
        rep = new Reputation();
        escrow = new SettlementEscrow(IERC20(address(usdg)), rep, operator, feeRecipient, 500);
        rep.setSettlement(address(escrow));

        usdg.mint(user, 100e6); // 100 USDG
        vm.startPrank(user);
        usdg.approve(address(escrow), type(uint256).max);
        escrow.deposit(50e6);
        vm.stopPrank();
    }

    function test_depositAndWithdraw_noLockup() public {
        assertEq(escrow.balances(user), 50e6);
        vm.prank(user);
        escrow.withdraw(20e6);
        assertEq(escrow.balances(user), 30e6);
        assertEq(usdg.balanceOf(user), 70e6);
    }

    function test_charge_paysVendorAndProtocol_andRecordsReputation() public {
        vm.prank(operator);
        escrow.charge(user, UNISWAP, vendor, 1e6, true, 612);

        assertEq(escrow.balances(user), 49e6);
        assertEq(usdg.balanceOf(feeRecipient), 0.05e6); // 5%
        assertEq(usdg.balanceOf(vendor), 0.95e6);

        (uint64 calls, uint64 successes, uint32 lat) = rep.stats(UNISWAP);
        assertEq(calls, 1);
        assertEq(successes, 1);
        assertEq(lat, 612);
        assertGt(rep.scoreOf(UNISWAP), 9000);
    }

    function test_charge_revertsForNonOperator() public {
        vm.expectRevert(SettlementEscrow.NotOperator.selector);
        escrow.charge(user, UNISWAP, vendor, 1e6, true, 100);
    }

    function test_dailyLimit_enforced_andResets() public {
        vm.prank(user);
        escrow.setDailyLimit(2e6); // 2 USDG / day

        vm.startPrank(operator);
        escrow.charge(user, UNISWAP, vendor, 1e6, true, 300);
        escrow.charge(user, UNISWAP, vendor, 1e6, true, 300);
        vm.expectRevert(SettlementEscrow.DailyLimitExceeded.selector);
        escrow.charge(user, UNISWAP, vendor, 1, true, 300);
        vm.stopPrank();

        // next UTC day → limit resets
        vm.warp(block.timestamp + 1 days);
        vm.prank(operator);
        escrow.charge(user, UNISWAP, vendor, 1e6, true, 300);
    }

    function test_charge_revertsOnInsufficientBalance() public {
        vm.prank(operator);
        vm.expectRevert(SettlementEscrow.InsufficientBalance.selector);
        escrow.charge(user, UNISWAP, vendor, 51e6, true, 100);
    }

    /// A token that returns false instead of reverting must not credit a deposit —
    /// otherwise anyone could mint escrow balance out of thin air and drain the contract.
    function test_deposit_revertsWhenTokenFailsSilently() public {
        (SettlementEscrow e, SilentFailUSDG bad) = _silentFailEscrow();
        bad.setFail(false, true); // transferFrom returns false

        vm.prank(user);
        vm.expectRevert(SettlementEscrow.TransferFailed.selector);
        e.deposit(50e6);

        assertEq(e.balances(user), 0);
    }

    function test_withdraw_revertsWhenTokenFailsSilently() public {
        (SettlementEscrow e, SilentFailUSDG bad) = _silentFailEscrow();

        vm.prank(user);
        e.deposit(50e6); // transfers still work here
        assertEq(e.balances(user), 50e6);

        bad.setFail(true, false); // now transfer returns false
        vm.prank(user);
        vm.expectRevert(SettlementEscrow.TransferFailed.selector);
        e.withdraw(10e6);

        assertEq(e.balances(user), 50e6); // balance survives the failed payout
    }

    function test_charge_revertsWhenVendorPayoutFailsSilently() public {
        (SettlementEscrow e, SilentFailUSDG bad) = _silentFailEscrow();
        vm.prank(user);
        e.deposit(50e6);

        bad.setFail(true, false);
        vm.prank(operator);
        vm.expectRevert(SettlementEscrow.TransferFailed.selector);
        e.charge(user, UNISWAP, vendor, 1e6, true, 300);

        assertEq(e.balances(user), 50e6); // nothing is debited if the vendor wasn't paid
    }

    function _silentFailEscrow() private returns (SettlementEscrow e, SilentFailUSDG bad) {
        bad = new SilentFailUSDG();
        e = new SettlementEscrow(IERC20(address(bad)), rep, operator, feeRecipient, 500);
        bad.mint(user, 100e6);
    }
}
