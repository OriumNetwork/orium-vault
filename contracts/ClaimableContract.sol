// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ClaimableContract is Ownable {

  address[] public tokenAddresses;
  uint[] public amountToSend;

  function claim() public {
    for (uint i = 0; i < tokenAddresses.length; i++) {
      ERC20(tokenAddresses[i]).transfer(msg.sender, amountToSend[i]);
    }
  }

  function setGiveAwayQuantities(address[] memory _tokenAddresses, uint[] memory _amountToSend) public onlyOwner {
    require(_tokenAddresses.length == _amountToSend.length, "Array lengths are different");
    tokenAddresses = _tokenAddresses;
    amountToSend = _amountToSend;
  }

}
