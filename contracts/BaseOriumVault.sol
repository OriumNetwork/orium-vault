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
  // Array of all Nfts
  Nft[] public nfts;

  // Mapping of owner => nftsIndex[]
  mapping (address => Nft[]) public owners;

  address[] public splitOwners;

  // Mapping of token generation event name => splits between splitOwners
  mapping (string => uint8[]) public tokenGenerationEvents;

  // mapping of scholar address => scholar nfts indexes
  mapping (address => uint[]) public scholarships;

  // Keeps indexes of mapping above
  address[] public scholarAddresses;

  // Mapping of owner => tokenAddress => balance
  mapping (address => mapping (address => uint)) public balances;

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

  event ERC721Withdrawn(address indexed to, address indexed ERC721Address, uint256 indexed tokenId);

  event ERC721MarkedForWithdrawn(address indexed to, address indexed ERC721Address, uint256 indexed tokenId);

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

    Nft memory newNft = Nft(msg.sender, _tokenId, _tokenAddress, false, false);
    nfts.push(newNft);
    owners[msg.sender].push(newNft);

    emit ERC721Received(_tokenAddress, msg.sender, _tokenId);
  }

  // Before calling this function, caller should approve transfer on ERC721 contract
  function batchDepositNfts(address[] calldata _tokenAddresses, uint256[] calldata _tokenIds) external {
    require(_tokenAddresses.length == _tokenIds.length, "Arrays should have the same length");
    for (uint i = 0; i < _tokenIds.length; i++) {
      depositNft(_tokenAddresses[i], _tokenIds[i]);
    }
  }

  function removeNft(address _owner, address _tokenAddress, uint _tokenId) internal {
    for (uint i = 0; i < nfts.length; i++) {
      if (nfts[i].owner == _owner && nfts[i].tokenAddress == _tokenAddress && nfts[i].tokenId == _tokenId) {
        nfts[i] = nfts[nfts.length - 1];
        nfts.pop();
        break;
      }
    }
  }

  /**
   * @dev Withdraw the NFT specified by the parameters
   * @param _tokenAddress The address of the ERC721 token
   * @param _tokenId The id of the ERC721 token
   *
   */
  function withdrawNft(address _tokenAddress, uint256 _tokenId) public {

    Nft[] storage callerNfts = owners[msg.sender];

    require(callerNfts.length > 0, "No nfts deposited in this Vault");

    for (uint256 i = 0; i < callerNfts.length; i++) {
      if (callerNfts[i].tokenAddress == _tokenAddress && callerNfts[i].tokenId == _tokenId) {
        if (callerNfts[i].rented) {
          callerNfts[i].takeBack = true;
          emit ERC721MarkedForWithdrawn(msg.sender, _tokenAddress, _tokenId);
          return;
        } else {
          ERC721(_tokenAddress).safeTransferFrom(address(this), msg.sender, _tokenId);
          callerNfts[i] = callerNfts[callerNfts.length - 1];
          callerNfts.pop();
          removeNft(msg.sender, _tokenAddress, _tokenId);
          emit ERC721Withdrawn(msg.sender, _tokenAddress, _tokenId);
          return;
        }
      }
    }

    require(false, "Nft not found for owner");
  }

  function batchWithdrawNfts(address[] calldata _tokenAddresses, uint256[] calldata _tokenIds) external {
    // TODO: This function can be optimized. In the withdrawNft, a loop is performed
    // to find each individual nft. That loop can be brought here so that many iterations
    // will be removed.
    require(_tokenAddresses.length == _tokenIds.length, "Arrays should have the same length");
    for (uint i = 0; i < _tokenIds.length; i++) {
      withdrawNft(_tokenAddresses[i], _tokenIds[i]);
    }
  }

  function withdrawAllNfts() external {
    require(owners[msg.sender].length > 0, "No NFTs deposited in this Vault");
    for (uint i = 0; i < owners[msg.sender].length; i++) {
      Nft memory nft = owners[msg.sender][i];
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
    tokenGenerationEvents[_name] = _splits;
  }

  function distributeTokens(address _tokenAddress, uint _amount, string memory _tokenGenerationEventName) external onlyAdmin {
    require(ERC20(_tokenAddress).balanceOf(address(this)) >= _amount, "Tokens were not transferred into here");
    uint8[] storage splits = tokenGenerationEvents[_tokenGenerationEventName];
    for (uint i = 0; i < splitOwners.length; i++) {
      uint result = balances[splitOwners[i]][_tokenAddress] + (_amount * splits[i] / 100);
      require(result > balances[splitOwners[i]][_tokenAddress], "Overflow in balance");
      balances[splitOwners[i]][_tokenAddress] = result;
    }
  }

  function _startScholarship(address _scholar, uint[] memory _tokenIndexes) internal virtual;

  function startScholarship(address _scholar, uint[] calldata _tokenIndexes) external onlyAdmin {
    require(_tokenIndexes.length > 0, "_tokenIndexes length is zero");
    require(scholarships[_scholar].length == 0, "Scholar already has scholarship");
    for (uint i = 0; i < _tokenIndexes.length; i++) {
      require(nfts.length > _tokenIndexes[i], "Nfts array index out of bounds");
      require(!nfts[_tokenIndexes[i]].rented, "Nft is already rented");
      require(!nfts[_tokenIndexes[i]].takeBack, "Nft is marked to be withdrawn");
      nfts[_tokenIndexes[i]].rented = true;
    }
    scholarships[_scholar] = _tokenIndexes;
    scholarAddresses.push(_scholar);

    _startScholarship(_scholar, _tokenIndexes);
  }

  function _endScholarship(address _scholar) internal virtual;

  function endScholarship(address _scholar) external onlyAdmin {
    require(scholarships[_scholar].length > 0, "Scholarship does not exist");
    uint[] storage indexes = scholarships[_scholar];
    for (uint i = 0; i < indexes.length; i++) {
      nfts[indexes[i]].rented = false;
    }
    for (uint i = 0; i < scholarAddresses.length; i++) {
      if (scholarAddresses[i] == _scholar) {
        scholarAddresses[i] = scholarAddresses[scholarAddresses.length - 1];
        scholarAddresses.pop();
        break;
      }
    }
    delete scholarships[_scholar];

    _endScholarship(_scholar);
  }

  function getNumScholarships() external view returns (uint) {
    return scholarAddresses.length;
  }

  function claim(address _tokenAddress) external {
    uint toTransfer = balances[msg.sender][_tokenAddress];
    require (toTransfer > 0, "No balance to claim");
    balances[msg.sender][_tokenAddress] = 0;
    bool result = ERC20(_tokenAddress).transfer(msg.sender, toTransfer);
    require(result, "Transfer failed");
  }

  function balanceOfTokens(address _tokenAddress, address _owner) external view returns (uint) {
    return balances[_tokenAddress][_owner];
  }

  function getAllNfts(address _owner) external view returns (Nft[] memory) {
    return owners[_owner];
  }

}
