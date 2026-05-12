// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ProductRegistry} from "../src/ProductRegistry.sol";

/// @title Deploy.s.sol — Foundry deploy script for ProductRegistry.
/// @notice Detects the active network from chainid and writes the deployed
///         address to out/address.<network>.json so the Coordination Hub
///         can pick it up at startup. Mirrors the Hardhat deploy script in
///         contracts/deploy/01_deploy_product_registry.ts so both paths
///         produce identical bytecode + identical address on a fresh chain.
///
/// @dev Local / Amoy:
///        forge script script/Deploy.s.sol \
///          --rpc-url $RPC_URL \
///          --broadcast \
///          --private-key $DEPLOYER_PRIVATE_KEY
///
///        Polygon mainnet (KMS — never a raw key on disk):
///        forge script script/Deploy.s.sol \
///          --rpc-url $MAINNET_RPC_URL \
///          --aws --aws-kms-key-id $KMS_KEY_ARN \
///          --broadcast --verify \
///          --etherscan-api-key $POLYGONSCAN_API_KEY
///
///        Dry-run only (no broadcast — for the pre-deploy checklist
///        in docs/MAINNET_DEPLOY.md):
///        forge script script/Deploy.s.sol --rpc-url $MAINNET_RPC_URL
contract Deploy is Script {
    /// @notice Minimum sender balance required before broadcasting on
    ///         mainnet. Covers the deploy tx (~0.5 MATIC at average
    ///         gas), 30 days of producer wallet top-ups, and a 10×
    ///         safety margin per docs/MAINNET_DEPLOY.md.
    uint256 public constant MAINNET_MIN_BALANCE = 5 ether;

    function run() external returns (ProductRegistry registry) {
        string memory networkLabel = _networkLabel(block.chainid);

        // Mainnet guard: refuse to broadcast if the deployer wallet is
        // underfunded. This catches the common operator mistake of
        // running with a fresh KMS key that hasn't been topped up yet.
        // Use tx.origin because msg.sender during a `forge script
        // --broadcast` is the script contract itself; tx.origin is the
        // EOA that signed.
        if (block.chainid == 137) {
            uint256 balance = tx.origin.balance;
            console.log("Mainnet deploy detected (chainid=137).");
            console.log("Sender:", tx.origin);
            console.log("Sender balance (wei):", balance);
            require(
                balance >= MAINNET_MIN_BALANCE,
                "DEPLOY: sender balance < 5 MATIC; see docs/MAINNET_DEPLOY.md pre-deploy checklist"
            );
        }

        vm.startBroadcast();
        registry = new ProductRegistry();
        vm.stopBroadcast();

        string memory path = string.concat("out/address.", networkLabel, ".json");
        string memory json = string.concat(
            '{"contractAddress":"',
            vm.toString(address(registry)),
            '","chainId":',
            vm.toString(block.chainid),
            ',"network":"',
            networkLabel,
            '"}'
        );
        vm.writeFile(path, json);

        console.log("ProductRegistry deployed at:", address(registry));
        console.log("Network:", networkLabel);
        console.log("Address written to:", path);
        if (block.chainid == 137) {
            console.log("Mainnet deploy SUCCESS. Next: run script/Verify.s.sol");
            console.log("and follow docs/MAINNET_DEPLOY.md post-deploy verification.");
        }
    }

    function _networkLabel(uint256 chainid) internal pure returns (string memory) {
        if (chainid == 31337) return "local";
        if (chainid == 80002) return "amoy";
        if (chainid == 137) return "mainnet";
        return "unknown";
    }
}
