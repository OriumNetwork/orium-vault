const { ethers, upgrades } = require('hardhat');

require('dotenv').config();

async function main () {
  const Vault = await ethers.getContractFactory('AavegotchiOriumVault');
  console.log('Deploying vault...');
  const admin = process.env.ADMIN_ADDRESS;
  const vault = await upgrades.deployProxy(Vault, [admin, 'TestVault']);
  await vault.deployed();
  console.log('Vault deployed to:', vault.address);
}

main();

