# Orium Vault
A set of smart contracts enabling the Orium Vault: a common place where Guilds
will deposit their NFTs in order to rent them out to scholars.

One Vault will be deployed for each Guild that joins the Orium Network. 

Not only Guilds but anyone will be able to deposit their NFTs into a specific 
Guild Vault. Guild's job will be to rentabilize the NFTs and distribute the 
rewards accordingly.

There will be one Vault Type per each game supported by the Orium Network.
Each of these types should extend the base smart contract: BaseOriumVault.sol.

## Composability

Anyone will be able to build an interface on top on those smart contracts. 
Orium Network will provide its own version but other players may enter this
game as well.

There are some functions that only the Vault Admin can call. The vault admin
should be set in the initializer (see @openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol).

The following functions from the Vault can be called by anyone:

```javascript
function _isAddressInWhitelist(address _addr) internal view returns (bool);

function depositNft(address _tokenAddress, uint256 _tokenId) public;

function batchDepositNfts(address[] calldata _tokenAddresses, uint256[] calldata _tokenIds) external;

function withdrawNft(address _tokenAddress, uint256 _tokenId) public;

function batchWithdrawNfts(address[] calldata _tokenAddresses, uint256[] calldata _tokenIds) external;

function withdrawAllNfts() external;

function claim(address tokenAddress) external;

function balanceOfTokens(address tokenAddress, address owner) external view returns (uint);

function getAllNfts(address owner) external view returns (Nft[] memory);
```

Beside those functions, there are also functions that only admins can call. They are:

```javascript
function changeName(string memory _newName) external onlyAdmin;

function changeAdmin(address _newAdmin) external onlyAdmin;

function setClaimableTokens(address[] memory _tokens) external onlyAdmin;

function addNftAddressesToWhitelist(address[] memory _addresses) external onlyAdmin;

function distributeTokens(address tokenAddress, uint amount, string memory tokenGenerationEventName) external onlyAdmin;

function startScholarship(address _scholar, uint[] calldata _tokenIndexes) external onlyAdmin;

function endScholarship(address _scholar) external onlyAdmin;
```

## Tests

There are a set of tests that covers all functionality of the smart contracts.
To run them:

`npx hardhat test`


