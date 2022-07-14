const { ethers, upgrades } = require('hardhat');

async function main () {
  const Vault = await ethers.getContractFactory('AavegotchiOriumVault');
  console.log('Upgrading Vault...');
  await upgrades.upgradeProxy('0xE0058D07174Fd0e2049B4C424672044c58e08720', Vault);
  console.log('Vault upgraded');
}

main();

