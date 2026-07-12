// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {Reputation} from "../src/Reputation.sol";
import {VendorRegistry} from "../src/VendorRegistry.sol";
import {SettlementEscrow} from "../src/SettlementEscrow.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";

/// forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --private-key $PK
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        MockUSDG usdg = new MockUSDG();
        Reputation reputation = new Reputation();
        VendorRegistry registry = new VendorRegistry(IERC20(address(usdg)), 500e6);
        SettlementEscrow escrow = new SettlementEscrow(
            IERC20(address(usdg)),
            reputation,
            msg.sender,   // operator = deployer for local dev
            msg.sender,   // feeRecipient
            500           // 5% protocol fee
        );
        reputation.setSettlement(address(escrow));

        // seed the dev wallet with 10,000 USDG
        usdg.mint(msg.sender, 10_000e6);

        console2.log("USDG_ADDRESS=", address(usdg));
        console2.log("REPUTATION_ADDRESS=", address(reputation));
        console2.log("VENDOR_REGISTRY_ADDRESS=", address(registry));
        console2.log("SETTLEMENT_ESCROW_ADDRESS=", address(escrow));

        vm.stopBroadcast();
    }
}
