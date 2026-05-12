// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";

/// @title Verify.s.sol — helper that reads address.<network>.json and prints
///        the polygonscan verification command. Actual verification still goes
///        through `forge verify-contract`; this script just removes the manual
///        copy-paste of the deployed address.
contract Verify is Script {
    function run() external view {
        string memory networkLabel = _networkLabel(block.chainid);
        string memory addrFile = string.concat("out/address.", networkLabel, ".json");
        string memory raw = vm.readFile(addrFile);
        address deployed = vm.parseJsonAddress(raw, ".contractAddress");

        console.log("Run:");
        console.log(
            string.concat(
                "  forge verify-contract ",
                vm.toString(deployed),
                " src/ProductRegistry.sol:ProductRegistry --chain ",
                networkLabel,
                " --watch"
            )
        );
    }

    function _networkLabel(uint256 chainid) internal pure returns (string memory) {
        if (chainid == 80002) return "amoy";
        if (chainid == 137) return "mainnet";
        return "local";
    }
}
