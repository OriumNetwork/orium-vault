// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

abstract contract BaseOriumVault is IERC721Receiver {

  struct Nft {
    address owner;
    uint tokenId;
    address tokenAddress;
    bool rented;
    bool takeBack;
  }
  Nft[] public nfts;

  // Mapping of owner => tokenAddress => tokenId => nftsIndex
  mapping (address => mapping (address => mapping (uint => uint))) public holdings;

  // Mapping of owner => nftsIndex[]
  mapping (address => uint[]) owners;

  address[] public splitOwners;
  struct TokenGenerationEvent {
    string name;
    uint8[] splits;
  }
  TokenGenerationEvent[] public tokenGenerationEvents;

  // TODO: Fazer estrutura para armazenar splits de token generation events.
  // Hoje temos: Spillover, Channeling e Farming

  struct Scholarship {
    address scholar;
    uint[] nftIndexes;
  }
  Scholarship[] public scholarships;

  // Mapping of owner => tokenAddress => balance
  mapping (address => mapping (address => uint)) balances;

  address[] public nftAddressWhitelist;

  // Guild owner (admin) of this contract
  address public admin;

  // Name of this vault
  string public name;

  // Type (game, platform, etc) of this vault
  VaultType vaultType;

  // ERC20 addresses of claimable tokens
  address[] internal claimableTokens;


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

  function changeName(string memory _newName) external onlyAdmin {
    name = _newName;
  }

  function changeAdmin(address _newAdmin) external onlyAdmin {
    admin = _newAdmin;
  }

  function setClaimableTokens(address[] memory _tokens) external onlyAdmin {
    claimableTokens = _tokens;
  }

  function addNftAddressesToWhitelist(address[] memory _addresses) external onlyAdmin {
    for (uint i = 0; i < _addresses.length; i++) {
      nftAddressWhitelist.push(_addresses[i]);
    }
  }

  function _isAddressInWhitelist(address _addr) internal view returns (bool) {
    for (uint i = 0; i < nftAddressWhitelist.length; i++) {
      if (nftAddressWhitelist[i] == _addr) return true;
    }
    return false;
  }

  function onERC721Received(address _operator, address, uint256, bytes calldata) external view override returns (bytes4) {

    // This require makes it mandatory that ANY transfer of NFTs to this 
    // contract must be executed by this own contract.
    require(_operator == address(this), "Cannot receive NFT tranfers that did not originated from here");

    return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
  }

  // Before calling this function, caller should approve transfer on ERC721 contract
  function depositNft(address _tokenAddress, uint256 _tokenId) public {

    require(_isAddressInWhitelist(_tokenAddress), "This NFT cannot be deposited into this Vault");

    require(ERC721(_tokenAddress).getApproved(_tokenId) == address(this), "Need to approve transfer on ERC721 first");

    ERC721(_tokenAddress).safeTransferFrom(msg.sender, address(this), _tokenId);

    uint newNftIndex = nfts.length;
    Nft memory newNft = Nft(msg.sender, _tokenId, _tokenAddress, false, false);
    nfts.push(newNft);
    holdings[msg.sender][_tokenAddress][_tokenId] = newNftIndex;
    owners[msg.sender].push(newNftIndex);

    emit ERC721Received(_tokenAddress, msg.sender, _tokenId);
  }

  // Before calling this function, caller should approve transfer on ERC721 contract
  function batchDepositNfts(address[] calldata _tokenAddresses, uint256[] calldata _tokenIds) external {
    require(_tokenAddresses.length == _tokenIds.length, "Arrays should have the same length");
    for (uint i = 0; i < _tokenIds.length; i++) {
      depositNft(_tokenAddresses[i], _tokenIds[i]);
    }
  }

  /**
   * @dev Withdraw the NFT specified by the parameters
   * @param _tokenAddress The address of the ERC721 token
   * @param _tokenId The id of the ERC721 token
   *
   * @return False if withdraw could not be performed right away. In this case
   * the token is marked to be withdraw as soon as his rental contract finishes.
   */

  function withdrawNft(address _tokenAddress, uint256 _tokenId) public returns (bool) {

    uint index = holdings[msg.sender][_tokenAddress][_tokenId];

    require(
      nfts[index].owner == msg.sender && 
      nfts[index].tokenAddress == _tokenAddress &&
      nfts[index].tokenId == _tokenId, "Sender does not have the specified tokenId deposited here");

    if (nfts[index].rented) {
      nfts[index].takeBack = true;
      return false;
    }

    nfts[index] = nfts[nfts.length - 1];
    nfts.pop();

    for (uint i = 0; i < owners[msg.sender].length; i++) {
      if (owners[msg.sender][i] == index) {
        owners[msg.sender][i] = owners[msg.sender][owners[msg.sender].length - 1];
        owners[msg.sender].pop();
        break;
      }
    }

    delete holdings[msg.sender][_tokenAddress][_tokenId];

    ERC721(_tokenAddress).safeTransferFrom(address(this), msg.sender, _tokenId);

    emit ERC721Withdrawn(msg.sender, _tokenId);

    return true;
  }

  function batchWithdrawNft(address[] calldata _tokenAddresses, uint256[] calldata _tokenIds) external {
    require(_tokenAddresses.length == _tokenIds.length, "Arrays should have the same length");
    for (uint i = 0; i < _tokenIds.length; i++) {
      withdrawNft(_tokenAddresses[i], _tokenIds[i]);
    }
  }

  function withdrawAllNfts() external {
    require(owners[msg.sender].length > 0, "No NFTs deposited in this Vault");
    for (uint i = 0; i < owners[msg.sender].length; i++) {
      Nft memory nft = nfts[owners[msg.sender][i]];
      withdrawNft(nft.tokenAddress, nft.tokenId);
    }
  }

  function setSplitOwners(address[] calldata _owners) external onlyAdmin {
    splitOwners = _owners;
  }

  function createTokenGenerationEvent(string calldata _name, uint8[] calldata _splits) external onlyAdmin {

    require(_splits.length == splitOwners.length, "Arrays should have the same length");

    uint8 total = 0;
    for (uint i = 0; i < _splits.length; i++) {
      total += _splits[i];
    }
    require(total == 100, "Splits does not sum up to 100");

    tokenGenerationEvents.push(TokenGenerationEvent(_name, _splits));
  }

  function _startScholarship(address _scholar, address[] memory _tokenAddresses, uint[] memory _tokenIds) internal virtual;

  function startScholarship(address _scholar, uint[] calldata _tokenIndexes) external onlyAdmin {
    for (uint i = 0; i < _tokenIndexes.length; i++) {
      require(!nfts[_tokenIndexes[i]].rented, "Nft is already rented");
      require(!nfts[_tokenIndexes[i]].takeBack, "Nft is marked to be withdraw");
      nfts[_tokenIndexes[i]].rented = true;
    }
    scholarships.push(Scholarship(_scholar, _tokenIndexes));
  }

  function _endScholarship(address _scholar) internal virtual;
  function endScholarship(address _scholar) external onlyAdmin {
  }

  function getNumScholarships() external view returns (uint) {
    return scholarships.length;
  }

  function getScholarship(uint _index) external view returns (Scholarship memory) {
    return scholarships[_index];
  }

  function claim(address tokenAddress) external {
    require (balances[tokenAddress][msg.sender] > 0, "No balance to claim");
    uint toTransfer = balances[tokenAddress][msg.sender];
    balances[tokenAddress][msg.sender] = 0;
    ERC20(tokenAddress).transferFrom(address(this), msg.sender, toTransfer);
  }

  function balanceOf(address tokenAddress, address owner) external view returns (uint) {
    return balances[tokenAddress][owner];
  }

}
