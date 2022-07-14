const { expect } = require("chai");

describe("ClaimableContract", function () {
  let claimable;
  let token1, token2, token3;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const Token1 = await ethers.getContractFactory("SimpleToken1");
    token1 = await Token1.deploy("SimpleToken1", "ST1", 10000000);

    const Token2 = await ethers.getContractFactory("SimpleToken2");
    token2 = await Token2.deploy("SimpleToken2", "ST2", 10000000);

    const Token3 = await ethers.getContractFactory("SimpleToken3");
    token3 = await Token3.deploy("SimpleToken3", "ST3", 10000000);

    const Claimable = await ethers.getContractFactory("ClaimableContract");
    claimable = await Claimable.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await claimable.owner()).to.equal(owner.address);
    });
    it("Should set addresses and quantities", async function () {
      const addrs = [token1.address, token2.address, token3.address];
      const qties = [1000, 2000, 3000];
      await claimable.setGiveAwayQuantities(addrs, qties);
      //expect(claimable.setGiveAwayQuantities(addrs, qties)).to.not.be.reverted();
    });
  });
  describe("Distribution of tokens", function () {
    it("Should give away tokens after claim", async function () {
      const addrs = [token1.address, token2.address, token3.address];
      const qties = [1000, 2000, 3000];
      await claimable.setGiveAwayQuantities(addrs, qties);

      await token1.transfer(claimable.address, 1000000);
      await token2.transfer(claimable.address, 1000000);
      await token3.transfer(claimable.address, 1000000);

      await claimable.connect(addr1).claim();

      expect(await token1.balanceOf(addr1.address)).to.equal(qties[0]);
      expect(await token2.balanceOf(addr1.address)).to.equal(qties[1]);
      expect(await token3.balanceOf(addr1.address)).to.equal(qties[2]);
    });
  });

});
