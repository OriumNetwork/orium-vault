// SPDX-License-Identifier: UNLICENSED
// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";



contract SimpleNft is ERC721URIStorage, Ownable {

  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;

  constructor() ERC721("TestNft", "NFT") {}

  function mint(address newOwner, string memory tokenURI) public onlyOwner returns (uint256) {

    _tokenIds.increment();
    uint256 tokenId = _tokenIds.current();
    _mint(newOwner, tokenId);
    _setTokenURI(tokenId, tokenURI);

    return tokenId;
  }


}
