// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "./BaseOriumVault.sol";
import "./ClaimableContract.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract UpgradedAavegotchi is BaseOriumVault, Initializable {

  // Balances in the format: tokenAddress -> owner -> balance
  mapping (address => mapping (address => uint256)) public balances;

  function initialize(address _admin, string memory _name) public initializer {
    admin = _admin;
    name = _name;
    vaultType = VaultType.AAVEGOTCHI;
  }

  function claim(address claimableAddress) public onlyAdmin {
    // get balance of all tokens before claim
    uint[] memory preClaimBalances = new uint[](claimableTokens.length);
    for (uint i = 0; i < claimableTokens.length; i++) {
      preClaimBalances[i] = ERC20(claimableTokens[i]).balanceOf(address(this));
    }

    ClaimableContract(claimableAddress).claim();

    // get balance of all tokens before claim
    for (uint i = 0; i < claimableTokens.length; i++) {
      uint posClaimBalance = ERC20(claimableTokens[i]).balanceOf(address(this));
      uint tokensEarned = posClaimBalance - preClaimBalances[i];
      require(tokensEarned >= 0, "Balance changed while executing function");
      if (tokensEarned == 0) continue;

      // Makes distribution between participants according to the splits
      for (uint j = 0; j < splits.length; j++) {
        require(tokensEarned * splits[j] > tokensEarned, "Overflow in tokensEarned * splits");
        uint share = tokensEarned * splits[j] / 100;
        balances[claimableTokens[i]][splitOwners[j]] = share;
      }
    }

  }

  function getClaimableBalance(address tokenAddress) public view returns (uint) {
    return balances[tokenAddress][msg.sender];
  }

  function upgraded() public pure returns (string memory) {
    return "worked";
  }

}
