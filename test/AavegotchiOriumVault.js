const { expect } = require("chai");
const { ethers, upgrades } = require('hardhat');

describe("BaseOriumVault", function () {

  let nft;
  let forbiddenNft;
  let oriumVault;
  let deployer;
  let addr1;
  let addr2;
  let addr3;

  beforeEach(async function () {
    SimpleNft = await ethers.getContractFactory("SimpleNft");
    [deployer, addr1, addr2, addr3] = await ethers.getSigners();
    nft = await SimpleNft.deploy();
    await nft.mint(addr1.address, 'uri1');
    await nft.mint(addr2.address, 'uri2');
    await nft.mint(addr3.address, 'uri3');

    forbiddenNft = await SimpleNft.deploy();
    await forbiddenNft.mint(deployer.address, 'uri1');

    const AavegotchiOriumVault = await ethers.getContractFactory("AavegotchiOriumVault");
    //oriumVault = await BaseOriumVault.deploy(addr3.address, "Test Vault", 0);
    oriumVault = await upgrades.deployProxy(AavegotchiOriumVault, [addr3.address, "Test Vault"]);
    await oriumVault.deployed();
    await oriumVault.connect(addr3).addNftAddressesToWhitelist([nft.address]);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await nft.owner()).to.equal(deployer.address);
    });
    it("Should have set whitelist", async function () {
      expect(await oriumVault.nftAddressWhitelist(0)).to.equal(nft.address);
    });
    it("Should mint nft to addresses", async function () {
      expect(await nft.ownerOf(1)).to.equal(addr1.address);
      expect(await nft.ownerOf(2)).to.equal(addr2.address);
      expect(await nft.ownerOf(3)).to.equal(addr3.address);
    });
  });

  describe("Admin operations", function () {
    // Functions that only admin can call: changeName, changeAdmin, setSplits
    it("Admin can call changeName", async function() {
      await oriumVault.connect(addr3).changeName("NewName");
      expect(await oriumVault.name()).to.equal("NewName");
    });
    it("Only admin can call changeName", async function() {
      await expect(oriumVault.changeName("test")).to.be.revertedWith('Only admin can call this function');
    });
    it("Admin can call changeAdmin", async function() {
      await oriumVault.connect(addr3).changeAdmin(addr2.address);
      expect(await oriumVault.admin()).to.equal(addr2.address);
    });
    it("Only admin can call changeAdmin", async function() {
      await expect(oriumVault.connect(addr2).changeAdmin(addr2.address)).to.be.revertedWith('Only admin can call this function');
    });
    it("Admin can call setSplitOwners", async function() {
      await oriumVault.connect(addr3).setSplitOwners([addr2.address]);
      const owner0 = await oriumVault.splitOwners(0);
      expect(owner0).to.equal(addr2.address);
    });
    it("Only admin can call setSplitOwners", async function() {
      await expect(oriumVault.setSplitOwners([addr2.address])).to.be.revertedWith('Only admin can call this function');
    });
    it("Admin can call addNftAddressesToWhitelist", async function() {
      await oriumVault.connect(addr3).addNftAddressesToWhitelist([nft.address])
      const addr = await oriumVault.nftAddressWhitelist(0);
      expect(addr).to.equal(nft.address);
    });
    it("Only admin can call addNftAddressesToWhitelist", async function() {
      await expect(oriumVault.addNftAddressesToWhitelist([])).to.be.revertedWith('Only admin can call this function');
    });
  });

  describe("NFT operations", function() {
    it("Should set approval", async function () {
      await nft.connect(addr3).approve(deployer.address, 3);
      expect(await nft.getApproved(3)).to.equal(deployer.address);
    });
    it("Should NOT be able to deposit NFT if not whitelisted", async function () {
      await forbiddenNft.approve(oriumVault.address, 1);
      await expect(oriumVault.connect(deployer).depositNft(forbiddenNft.address, 1)).to.be.revertedWith('This NFT cannot be deposited into this Vault');
    });
    it("Should NOT be able to receive random NFT", async function () {
      await expect(forbiddenNft["safeTransferFrom(address,address,uint256)"](deployer.address, oriumVault.address, 1)).to.be.revertedWith('Cannot receive NFT tranfers that did not originated from here');
    });
    it("Should deposit NFT", async function () {
      await nft.connect(addr3).approve(oriumVault.address, 3);
      await oriumVault.connect(addr3).depositNft(nft.address, 3);
      expect(await nft.ownerOf(3)).to.equal(oriumVault.address);
      let stored = await oriumVault.nfts(0);
      expect(stored.owner).to.equal(addr3.address);

      await nft.connect(addr2).approve(oriumVault.address, 2);
      await oriumVault.connect(addr2).depositNft(nft.address, 2);
      expect(await nft.ownerOf(2)).to.equal(oriumVault.address);
      stored = await oriumVault.nfts(1);
      expect(stored.owner).to.equal(addr2.address);

    });
    it("Should withdraw NFT", async function () {
      // Deposit token 3
      await nft.connect(addr3).approve(oriumVault.address, 3);
      await oriumVault.connect(addr3).depositNft(nft.address, 3);
      // Deposit token 2
      await nft.connect(addr2).approve(oriumVault.address, 2);
      await oriumVault.connect(addr2).depositNft(nft.address, 2);

      let stored = await oriumVault.nfts(0);
      expect(stored.owner).to.equal(addr3.address);
      stored = await oriumVault.nfts(1);
      expect(stored.owner).to.equal(addr2.address);

      // Withdraw token 3
      await oriumVault.connect(addr3).withdrawNft(nft.address, 3);
      expect(await nft.ownerOf(3)).to.equal(addr3.address);

      await expect(oriumVault.nfts(1)).to.be.reverted;
      stored = await oriumVault.nfts(0);
      expect(stored.owner).to.equal(addr2.address);

      // Withdraw token 2
      await oriumVault.connect(addr2).withdrawNft(nft.address, 2);
      expect(await nft.ownerOf(2)).to.equal(addr2.address);

      await expect(oriumVault.nfts(0)).to.be.reverted;

    });
    it("Cannot withdraw NFT if not owner", async function () {
      await nft.connect(addr3).approve(oriumVault.address, 3);
      await oriumVault.connect(addr3).depositNft(nft.address, 3);
      await expect(oriumVault.connect(addr2).withdrawNft(nft.address, 3)).to.be.revertedWith('Sender does not have the specified tokenId deposited here');
    });

  });
  describe("Split operations", function() {
    it("Should set splits correctly", async function () {
      const ownerAddresses = [addr1.address, addr2.address, addr3.address];
      await oriumVault.connect(addr3).setSplits(ownerAddresses, [10, 40, 50]);
    });
    it("Should not let set splits incorrectly (more than 100)", async function () {
      const ownerAddresses = [addr1.address, addr2.address, addr3.address];
      await expect(oriumVault.connect(addr3).setSplits(ownerAddresses, [10, 41, 50])).to.be.revertedWith('Splits does not sum up to 100');
    });
    it("Should not let set splits incorrectly (less than 100)", async function () {
      const ownerAddresses = [addr1.address, addr2.address, addr3.address];
      await expect(oriumVault.connect(addr3).setSplits(ownerAddresses, [10, 39, 50])).to.be.revertedWith('Splits does not sum up to 100');
    });
  });

});
