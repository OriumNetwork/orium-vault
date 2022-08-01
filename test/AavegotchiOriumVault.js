const { expect } = require("chai");
const { ethers, upgrades } = require('hardhat');

describe("BaseOriumVault", function () {

  let nft, nft2;
  let forbiddenNft;
  let oriumVault;
  let deployer;
  let addr1;
  let addr2;
  let addr3;
  let erc20;

  beforeEach(async function () {
    SimpleNft = await ethers.getContractFactory("SimpleNft");
    [deployer, addr1, addr2, addr3] = await ethers.getSigners();
    nft = await SimpleNft.deploy();
    await nft.mint(addr1.address, 'uri1');
    await nft.mint(addr2.address, 'uri2');
    await nft.mint(addr3.address, 'uri3');

    nft2 = await SimpleNft.deploy();
    await nft2.mint(addr1.address, 'uri1');
    await nft2.mint(addr2.address, 'uri2');
    await nft2.mint(addr3.address, 'uri3');

    forbiddenNft = await SimpleNft.deploy();
    await forbiddenNft.mint(deployer.address, 'uri1');

    const AavegotchiOriumVault = await ethers.getContractFactory("AavegotchiOriumVault");
    oriumVault = await upgrades.deployProxy(AavegotchiOriumVault, [addr3.address, "Test Vault"]);
    await oriumVault.deployed();
    await oriumVault.connect(addr3).addNftAddressesToWhitelist([nft.address, nft2.address]);

    SimpleToken1 = await ethers.getContractFactory("SimpleToken1");
    erc20 = await SimpleToken1.deploy("ERC20Token", "E20T", 1000000000);
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
      await expect(oriumVault.changeName("test"))
        .to.be.revertedWith('Only admin can call this function');
    });
    it("Admin can call changeAdmin", async function() {
      await oriumVault.connect(addr3).changeAdmin(addr2.address);
      expect(await oriumVault.admin()).to.equal(addr2.address);
    });
    it("Only admin can call changeAdmin", async function() {
      await expect(oriumVault.connect(addr2).changeAdmin(addr2.address))
        .to.be.revertedWith('Only admin can call this function');
    });
    it("Admin can call setSplitOwners", async function() {
      await oriumVault.connect(addr3).setSplitOwners([addr2.address]);
      const owner0 = await oriumVault.splitOwners(0);
      expect(owner0).to.equal(addr2.address);
    });
    it("Only admin can call setSplitOwners", async function() {
      await expect(oriumVault.setSplitOwners([addr2.address]))
        .to.be.revertedWith('Only admin can call this function');
    });
    it("Admin can call addNftAddressesToWhitelist", async function() {
      await oriumVault.connect(addr3).addNftAddressesToWhitelist([nft.address])
      const addr = await oriumVault.nftAddressWhitelist(0);
      expect(addr).to.equal(nft.address);
    });
    it("Only admin can call addNftAddressesToWhitelist", async function() {
      await expect(oriumVault.addNftAddressesToWhitelist([]))
        .to.be.revertedWith('Only admin can call this function');
    });
  });

  describe("NFT operations", function() {
    it("Should set approval", async function () {
      await nft.connect(addr3).approve(deployer.address, 3);
      expect(await nft.getApproved(3)).to.equal(deployer.address);
    });
    it("Should NOT be able to deposit NFT if not whitelisted", async function () {
      await forbiddenNft.approve(oriumVault.address, 1);
      await expect(oriumVault.connect(deployer).depositNft(forbiddenNft.address, 1))
        .to.be.revertedWith('This NFT cannot be deposited into this Vault');
    });
    it("Should NOT be able to receive random NFT", async function () {
      await expect(forbiddenNft["safeTransferFrom(address,address,uint256)"](deployer.address, oriumVault.address, 1))
        .to.be.revertedWith('Cannot receive NFT tranfers that did not originated from here');
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
      await expect(oriumVault.connect(addr2).withdrawNft(nft.address, 3))
        .to.be.revertedWith('No nfts deposited in this Vault');
    });

  });
  describe("Split operations", function() {
    it("Should set split owners correctly", async function () {
      const ownerAddresses = [addr1.address, addr2.address, addr3.address];
      await oriumVault.connect(addr3).setSplitOwners(ownerAddresses);
      expect(await oriumVault.splitOwners(0)).to.equal(addr1.address);
      expect(await oriumVault.splitOwners(2)).to.equal(addr3.address);
    });
    it("Should not create token generation event (more than 100% splits)", async function () {
      const ownerAddresses = [addr1.address, addr2.address, addr3.address];
      await oriumVault.connect(addr3).setSplitOwners(ownerAddresses);
      await expect(oriumVault.connect(addr3).createTokenGenerationEvent("test", [10, 41, 50]))
        .to.be.revertedWith("Splits does not sum up to 100");
    });
    it("Should not create token generation event (less than 100% splits)", async function () {
      const ownerAddresses = [addr1.address, addr2.address, addr3.address];
      await oriumVault.connect(addr3).setSplitOwners(ownerAddresses);
      await expect(oriumVault.connect(addr3).createTokenGenerationEvent("test", [10, 39, 50]))
        .to.be.revertedWith("Splits does not sum up to 100");
    });
    it("Should create token generation event correctly", async function () {
      const ownerAddresses = [addr1.address, addr2.address, addr3.address];
      await oriumVault.connect(addr3).setSplitOwners(ownerAddresses);
      await expect(oriumVault.connect(addr3).createTokenGenerationEvent("test", [10, 40, 50]))
        .to.not.be.reverted;
    });
    it("Should distribute tokens between split owners", async function () {
      const ownerAddresses = [addr1.address, addr2.address, addr3.address];
      await oriumVault.connect(addr3).setSplitOwners(ownerAddresses);
      await oriumVault.connect(addr3).createTokenGenerationEvent("test", [10, 40, 50])
      await erc20.transfer(oriumVault.address, 1000000);
      await oriumVault.connect(addr3).distributeTokens(erc20.address, 1000000, "test");
      expect(await oriumVault.balances(addr1.address, erc20.address)).to.equal(100000);
      expect(await oriumVault.balances(addr2.address, erc20.address)).to.equal(400000);
      expect(await oriumVault.balances(addr3.address, erc20.address)).to.equal(500000);
    });
    it("Should claim tokens correctly", async function () {
      const ownerAddresses = [addr1.address, addr2.address, addr3.address];
      await oriumVault.connect(addr3).setSplitOwners(ownerAddresses);
      await oriumVault.connect(addr3).createTokenGenerationEvent("test", [10, 40, 50])
      await erc20.transfer(oriumVault.address, 1000000);
      await oriumVault.connect(addr3).distributeTokens(erc20.address, 1000000, "test");

      await oriumVault.connect(addr1).claim(erc20.address);
      expect(await erc20.balanceOf(addr1.address)).to.equal(100000);

      await oriumVault.connect(addr2).claim(erc20.address);
      expect(await erc20.balanceOf(addr2.address)).to.equal(400000);

      await oriumVault.connect(addr3).claim(erc20.address);
      expect(await erc20.balanceOf(addr3.address)).to.equal(500000);
    });

  });

  describe("Batch operations", function() {
    it("Should deposit NFTs in batch", async function () {
      nft.connect(addr2).approve(oriumVault.address, 2);
      nft2.connect(addr2).approve(oriumVault.address, 2);
      const nftAddrs = [nft.address, nft2.address];
      const nftIds = [2, 2];
      await oriumVault.connect(addr2).batchDepositNfts(nftAddrs, nftIds);
      const nfts = await oriumVault.getAllNfts(addr2.address);
      expect(nfts.length).to.equal(2);
      expect(nfts[0].owner).to.equal(addr2.address);
      expect(nfts[0].tokenAddress).to.equal(nft.address);
      expect(nfts[0].tokenId).to.equal(2);
      expect(nfts[1].owner).to.equal(addr2.address);
      expect(nfts[1].tokenAddress).to.equal(nft2.address);
      expect(nfts[1].tokenId).to.equal(2);
    });
    it("Should withdraw NFTs in batch", async function () {
      nft.connect(addr2).approve(oriumVault.address, 2);
      nft2.connect(addr2).approve(oriumVault.address, 2);
      const nftAddrs = [nft.address, nft2.address];
      const nftIds = [2, 2];
      await oriumVault.connect(addr2).batchDepositNfts(nftAddrs, nftIds);

      await oriumVault.connect(addr2).batchWithdrawNfts(nftAddrs, nftIds);
      const nfts = await oriumVault.getAllNfts(addr2.address);
      expect(nfts.length).to.equal(0);
      expect(await nft.ownerOf(2)).to.equal(addr2.address);
      expect(await nft2.ownerOf(2)).to.equal(addr2.address);
    });
  });
  describe("Scholarship operations", function() {
    it("Should start scholarship with 1 nfts", async function () {
      // Addr3 deposits nft
      await nft.connect(addr3).approve(oriumVault.address, 3);
      await oriumVault.connect(addr3).depositNft(nft.address, 3);
      expect(await nft.ownerOf(3)).to.equal(oriumVault.address);

      // Addr2 deposits nft
      await nft.connect(addr2).approve(oriumVault.address, 2);
      await oriumVault.connect(addr2).depositNft(nft.address, 2);
      expect(await nft.ownerOf(2)).to.equal(oriumVault.address);

      // Starts scholarship for Addr1 using nft from Addr2
      await oriumVault.connect(addr3).startScholarship(addr1.address, [1]);
      expect(await oriumVault.scholarAddresses(0)).to.equal(addr1.address);
      expect(await oriumVault.scholarships(addr1.address, 0)).to.equal(1);

      const nft1 = await oriumVault.nfts(0);
      expect(nft1.rented).to.equal(false);

      const nft2 = await oriumVault.nfts(1);
      expect(nft2.rented).to.equal(true);
    });
    it("Should start scholarship with 2 nfts", async function () {
      // Addr3 deposits nft
      await nft.connect(addr3).approve(oriumVault.address, 3);
      await oriumVault.connect(addr3).depositNft(nft.address, 3);
      expect(await nft.ownerOf(3)).to.equal(oriumVault.address);

      // Addr2 deposits nft
      await nft.connect(addr2).approve(oriumVault.address, 2);
      await oriumVault.connect(addr2).depositNft(nft.address, 2);
      expect(await nft.ownerOf(2)).to.equal(oriumVault.address);

      // Starts scholarship for Addr1 using nfts from Addr2 and Addr3
      await oriumVault.connect(addr3).startScholarship(addr1.address, [0, 1]);
      expect(await oriumVault.scholarAddresses(0)).to.equal(addr1.address);
      expect(await oriumVault.scholarships(addr1.address, 0)).to.equal(0);
      expect(await oriumVault.scholarships(addr1.address, 1)).to.equal(1);

      const nft1 = await oriumVault.nfts(0);
      expect(nft1.rented).to.equal(true);

      const nft2 = await oriumVault.nfts(1);
      expect(nft2.rented).to.equal(true);
    });
    it("Can't start scholarship with wrong nfts", async function () {
      await expect(oriumVault.connect(addr3).startScholarship(addr1.address, [2, 3]))
        .to.be.revertedWith("Nfts array index out of bounds");
    });
    it("Can't use same Nft in different scholarships", async function () {
      // Addr3 deposits nft
      await nft.connect(addr3).approve(oriumVault.address, 3);
      await oriumVault.connect(addr3).depositNft(nft.address, 3);
      expect(await nft.ownerOf(3)).to.equal(oriumVault.address);

      // Addr2 deposits nft
      await nft.connect(addr2).approve(oriumVault.address, 2);
      await oriumVault.connect(addr2).depositNft(nft.address, 2);
      expect(await nft.ownerOf(2)).to.equal(oriumVault.address);

      // Starts scholarship for Addr1 using nfts from Addr2 and Addr3
      await oriumVault.connect(addr3).startScholarship(addr1.address, [0, 1]);

      // Starts scholarship for Addr2 using nfts from Addr3
      await expect(oriumVault.connect(addr3).startScholarship(addr2.address, [0]))
        .to.be.revertedWith("Nft is already rented");
    });
    it("Can't start two scholarship for same address", async function () {
      // Addr3 deposits nft
      await nft.connect(addr3).approve(oriumVault.address, 3);
      await oriumVault.connect(addr3).depositNft(nft.address, 3);
      expect(await nft.ownerOf(3)).to.equal(oriumVault.address);

      // Addr2 deposits nft
      await nft.connect(addr2).approve(oriumVault.address, 2);
      await oriumVault.connect(addr2).depositNft(nft.address, 2);
      expect(await nft.ownerOf(2)).to.equal(oriumVault.address);

      // Starts scholarship for Addr1 using nfts from Addr2 and Addr3
      await oriumVault.connect(addr3).startScholarship(addr1.address, [0, 1]);

      // Starts scholarship for Addr2 using nfts from Addr3
      await expect(oriumVault.connect(addr3).startScholarship(addr1.address, [0]))
        .to.be.revertedWith("Scholar already has");
    });
    it("End scholarship", async function () {
      // Addr3 deposits nft
      await nft.connect(addr3).approve(oriumVault.address, 3);
      await oriumVault.connect(addr3).depositNft(nft.address, 3);
      expect(await nft.ownerOf(3)).to.equal(oriumVault.address);

      // Addr2 deposits nft
      await nft.connect(addr2).approve(oriumVault.address, 2);
      await oriumVault.connect(addr2).depositNft(nft.address, 2);
      expect(await nft.ownerOf(2)).to.equal(oriumVault.address);

      // Starts scholarship for Addr1 using nfts from Addr2 and Addr3
      await oriumVault.connect(addr3).startScholarship(addr1.address, [0, 1]);

      await oriumVault.connect(addr3).endScholarship(addr1.address)

      const nft1 = await oriumVault.nfts(0);
      expect(nft1.rented).to.equal(false);

      const nft2 = await oriumVault.nfts(1);
      expect(nft2.rented).to.equal(false);
    });
    it("Can't end nonexistent scholarship", async function () {
      // Addr3 deposits nft
      await nft.connect(addr3).approve(oriumVault.address, 3);
      await oriumVault.connect(addr3).depositNft(nft.address, 3);
      expect(await nft.ownerOf(3)).to.equal(oriumVault.address);

      // Addr2 deposits nft
      await nft.connect(addr2).approve(oriumVault.address, 2);
      await oriumVault.connect(addr2).depositNft(nft.address, 2);
      expect(await nft.ownerOf(2)).to.equal(oriumVault.address);

      // Starts scholarship for Addr1 using nfts from Addr2 and Addr3
      await oriumVault.connect(addr3).startScholarship(addr1.address, [0, 1]);

      await expect(oriumVault.connect(addr3).endScholarship(addr2.address))
        .to.be.revertedWith("Scholarship does not exist");
    });
  });

});
