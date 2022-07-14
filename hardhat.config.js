require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');

require('@openzeppelin/hardhat-upgrades');

require('dotenv').config();

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://localhost:7545",
      accounts: {
        mnemonic: process.env.MNEMONIC_LOCALHOST
      }
    },
    hardhat: {
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [process.env.PRIVATE_KEY_MUMBAI]
    }
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY
  },
  solidity: {
    version: "0.8.2",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
}


