require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require('hardhat-gas-reporter');
require('@openzeppelin/hardhat-upgrades');

require('dotenv').config();

module.exports = {

  defaultNetwork: "hardhat",

  networks: {

    hardhat: {
    },

    /*
    localhost: {
      url: "http://localhost:7545",
      accounts: {
        mnemonic: process.env.MNEMONIC_FOR_TESTS
      }
    },
    */

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

  gasReporter: {
    enabled: true, 
    gasPrice: 100, token: 'MATIC', currency: 'USD',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY
  }

}


