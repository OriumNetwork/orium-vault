// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "./AavegotchiOriumVault.sol";
import "./ClaimableContract.sol";

contract UpgradedAavegotchi is AavegotchiOriumVault {
  function upgraded() public pure returns (string memory) {
    return "worked";
  }

}
