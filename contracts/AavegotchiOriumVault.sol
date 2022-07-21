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

  /*
  function claim(address _claimableAddress) public onlyAdmin {
    // get balance of all tokens before claim
    uint[] memory preClaimBalances = new uint[](_claimableTokens.length);
    for (uint i = 0; i < _claimableTokens.length; i++) {
      preClaimBalances[i] = ERC20(_claimableTokens[i]).balanceOf(address(this));
    }

    ClaimableContract(_claimableAddress).claim();

    // get balance of all tokens before claim
    for (uint i = 0; i < _claimableTokens.length; i++) {
      uint posClaimBalance = ERC20(_claimableTokens[i]).balanceOf(address(this));
      uint tokensEarned = posClaimBalance - preClaimBalances[i];
      require(tokensEarned >= 0, "Balance changed while executing function");
      if (tokensEarned == 0) continue;

      // Makes distribution between participants according to the splits
      for (uint j = 0; j < splits.length; j++) {
        require(tokensEarned * splits[j] > tokensEarned, "Overflow in tokensEarned * splits");
        uint share = tokensEarned * splits[j] / 100;
        balances[_claimableTokens[i]][splitOwners[j]] = share;
      }
    }
  }
  */

  function _startScholarship(address _scholar, address[] memory _tokenAddresses, uint[] memory _tokenIds) internal override {
  }

  function _endScholarship(address _scholar) internal override {
  }

}
