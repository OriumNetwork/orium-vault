const { expect } = require("chai");
const { ethers, upgrades } = require('hardhat');

describe("AavegotchiOriumVault", function () {

  let nft;
  let oriumVault;
  let deployer;
  let addr1;
  let addr2;
  let addr3;
  let claimable;

  beforeEach(async function () {
    SimpleNft = await ethers.getContractFactory("SimpleNft");
    [deployer, addr1, addr2, addr3] = await ethers.getSigners();
    nft = await SimpleNft.deploy();
    await nft.mint(addr1.address, 'uri1');
    await nft.mint(addr2.address, 'uri2');
    await nft.mint(addr3.address, 'uri3');

    const AavegotchiOriumVault = await ethers.getContractFactory("AavegotchiOriumVault");
    oriumVault = await upgrades.deployProxy(AavegotchiOriumVault, [addr3.address, "Test Vault"]);
    await oriumVault.deployed();

    const ClaimableContract = await ethers.getContractFactory("ClaimableContract");
    claimable = await ClaimableContract.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await nft.owner()).to.equal(deployer.address);
    });
    it("Should mint nft to addresses", async function () {
      expect(await nft.ownerOf(1)).to.equal(addr1.address);
      expect(await nft.ownerOf(2)).to.equal(addr2.address);
      expect(await nft.ownerOf(3)).to.equal(addr3.address);
    });
  });

  describe("Admin operations", function () {
    // Functions that only admin can call: changeName, changeAdmin, setSplits
    it("Only admin can call changeName", async function() {
      await expect(oriumVault.changeName("test")).to.be.revertedWith('Only admin can call this function');
    });
    it("Only admin can call changeAdmin", async function() {
      await expect(oriumVault.changeAdmin(addr2.address)).to.be.revertedWith('Only admin can call this function');
    });
    it("Only admin can call setSplits", async function() {
      await expect(oriumVault.setSplits([], [])).to.be.revertedWith('Only admin can call this function');
    });
  });

  describe("NFT operations", function() {
    it("Should set approval", async function () {
      await nft.connect(addr3).approve(deployer.address, 3);
      expect(await nft.getApproved(3)).to.equal(deployer.address);
    });
    it("ORIUM: Should deposit NFT", async function () {
      await nft.connect(addr3).approve(oriumVault.address, 3);
      //await nft["safeTransferFrom(address,address,uint256)"](addr3.address, oriumVault.address, 3);
      await oriumVault.connect(addr3).depositNft(nft.address, 3);
      expect(await nft.ownerOf(3)).to.equal(oriumVault.address);
    });
    it("ORIUM: Should withdraw NFT", async function () {
      await nft.connect(addr3).approve(oriumVault.address, 3);
      await oriumVault.connect(addr3).depositNft(nft.address, 3);

      await oriumVault.connect(addr3).withdrawNft(nft.address, 3);
      expect(await nft.ownerOf(3)).to.equal(addr3.address);
    });
    it("ORIUM: Cannot withdraw NFT if not owner", async function () {
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
  describe("Claim operation", function() {
    it("Should set splits correctly", async function () {
    });
  });


});
