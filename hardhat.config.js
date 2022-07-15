require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');

require('@openzeppelin/hardhat-upgrades');

require('dotenv').config();

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
    }
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


