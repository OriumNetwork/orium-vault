// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract BaseOriumVault is IERC721Receiver {

  enum VaultType {
    AAVEGOTCHI,
    AXIE_INFINITY,
    PEGAXY
  }

  modifier onlyAdmin {
    require(msg.sender == admin, "Only admin can call this function");
    _;
  }

  event ERC721Received(address indexed from, address indexed ERC721Address, uint256 indexed tokenId);

  event ERC721Withdrawn(address indexed to, uint256 indexed tokenId);

  // Mapping of tokenAddress -> owner -> tokenIds[]
  mapping (address => mapping (address => uint256[])) public holdings;

  // Guild owner (admin) of this contract
  address public admin;

  // Name of this vault
  string public name;

  // Type (game, platform, etc) of this vault
  VaultType vaultType;

  // Revenue share splits
  address[] internal splitOwners;
  uint8[] internal splits;

  // ERC20 addresses of claimable tokens
  address[] internal claimableTokens;

  function changeName(string memory newName) public onlyAdmin {
    name = newName;
  }

  function changeAdmin(address newAdmin) public onlyAdmin {
    admin = newAdmin;
  }

  function setClaimableTokens(address[] memory tokens) public onlyAdmin {
    claimableTokens = tokens;
  }

  function onERC721Received(address, address, uint256, bytes calldata) public pure override returns (bytes4) {
    return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
  }

  // Before calling this function, caller should approve transfer on ERC721 contract
  function depositNft(address tokenAddress, uint256 tokenId) public {

    require(ERC721(tokenAddress).getApproved(tokenId) == address(this), "Need to approve transfer on ERC721 first");

    uint256[] storage tokenIds = holdings[tokenAddress][msg.sender];
    tokenIds.push(tokenId);

    ERC721(tokenAddress).safeTransferFrom(msg.sender, address(this), tokenId);

    emit ERC721Received(tokenAddress, msg.sender, tokenId);
  }

  function withdrawNft(address tokenAddress, uint256 tokenId) public {
    uint256[] storage tokenIds = holdings[tokenAddress][msg.sender];
    bool found = false;
    for (uint i = 0; i < tokenIds.length; i++) {
      if (tokenIds[i] == tokenId) {
        tokenIds[i] = tokenIds[tokenIds.length - 1];
        tokenIds.pop();
        found = true;
      }
    }

    require(found, "Sender does not have the specified tokenId deposited here");

    ERC721(tokenAddress).safeTransferFrom(address(this), msg.sender, tokenId);

    emit ERC721Withdrawn(msg.sender, tokenId);
  }

  function setSplits(address[] calldata _owners, uint8[] calldata _splits) public onlyAdmin {
    require(_owners.length == _splits.length, "Owners and splits arrays differ in length");
    uint8 total = 0;
    for (uint i = 0; i < _splits.length; i++) {
      total += _splits[i];
    }
    require(total == 100, "Splits does not sum up to 100");
    splitOwners = _owners;
    splits = _splits;
  }

}
