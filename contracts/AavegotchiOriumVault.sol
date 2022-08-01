// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "./BaseOriumVault.sol";
import "./ClaimableContract.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract AavegotchiOriumVault is BaseOriumVault, Initializable {

  function initialize(address _admin, string memory _name) public initializer {
    admin = _admin;
    name = _name;
    vaultType = VaultType.AAVEGOTCHI;
  }

  function _startScholarship(address _scholar, uint[] memory _tokenIndexes) internal override {
  }

  function _endScholarship(address _scholar) internal override {
  }

}
