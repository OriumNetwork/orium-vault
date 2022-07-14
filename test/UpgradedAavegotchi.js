const { expect } = require("chai");
const { ethers, upgrades } = require('hardhat');

describe("UpgradedAavegotchi", function () {

  let nft;
  let oriumVault;
  let deployer;
  let addr1;
  let addr2;
  let addr3;
  let claimable;

  beforeEach(async function () {

    [deployer, addr1, addr2, addr3] = await ethers.getSigners();

    const AavegotchiOriumVault = await ethers.getContractFactory("AavegotchiOriumVault");
    oriumVault = await upgrades.deployProxy(AavegotchiOriumVault, [addr3.address, "Test Vault"]);
    await oriumVault.deployed();

  });

  describe("Deployment of proxy", function () {
    it("Should set the correct admin", async function () {
      expect(await oriumVault.admin()).to.equal(addr3.address);
    });
    it("Should set the correct name", async function () {
      expect(await oriumVault.name()).to.equal("Test Vault");
    });
  });

  describe("Upgrade contract", function () {
    it("Should upgrade base contract", async function () {
      const UpgradedAavegotchi = await ethers.getContractFactory("UpgradedAavegotchi");
      const upgraded = await upgrades.upgradeProxy(oriumVault, UpgradedAavegotchi);
      expect(await upgraded.admin()).to.equal(addr3.address);
      expect(await upgraded.name()).to.equal("Test Vault");
      expect(await upgraded.upgraded()).to.equal("worked");
    });
  });
});
