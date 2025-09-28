import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("CryptoExchange", function () {
  let cryptoExchange;
  let exchangeToken;
  let wethToken;
  let wbtcToken;
  let owner;
  let user1;
  let user2;

  const INITIAL_PRICE = 350000000000; // $3500 per ETH equivalent in our 10^8 format
  const MIN_TRADE_AMOUNT = 10**6; // Set in contract

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Exchange Token
    const CryptoToken = await ethers.getContractFactory("CryptoToken");
    exchangeToken = await CryptoToken.deploy("CryptoExchange Token", "CET");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simple wait for deployment

    // Deploy CryptoExchange
    const CryptoExchange = await ethers.getContractFactory("CryptoExchange");
    cryptoExchange = await CryptoExchange.deploy(await exchangeToken.getAddress());
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simple wait for deployment

    // Deploy mock WETH and WBTC tokens
    wethToken = await CryptoToken.deploy("Wrapped Ethereum", "WETH");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simple wait for deployment
    
    wbtcToken = await CryptoToken.deploy("Wrapped Bitcoin", "WBTC");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simple wait for deployment

    // Add assets to exchange
    await cryptoExchange.addAsset(
      await wethToken.getAddress(),
      "Wrapped Ethereum",
      INITIAL_PRICE
    );
    
    await cryptoExchange.addAsset(
      await wbtcToken.getAddress(),
      "Wrapped Bitcoin", 
      6500000000000 // $65000 per BTC equivalent
    );
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await cryptoExchange.owner()).to.equal(owner.address);
    });

    it("Should have correct initial state", async function () {
      const assetPrice = await cryptoExchange.getAssetPrice(await wethToken.getAddress());
      expect(assetPrice).to.equal(INITIAL_PRICE);
    });
  });

  describe("Asset Management", function () {
    it("Should allow owner to add assets", async function () {
      const newToken = await (await ethers.getContractFactory("CryptoToken"))
        .deploy("Test Token", "TEST");
      
      await expect(
        cryptoExchange.addAsset(
          await newToken.getAddress(),
          "Test Asset",
          10000000000 // $100 equivalent
        )
      )
        .to.emit(cryptoExchange, "AssetAdded")
        .withArgs(await newToken.getAddress(), "Test Asset");
    });

    it("Should not allow non-owner to add assets", async function () {
      const newToken = await (await ethers.getContractFactory("CryptoToken"))
        .deploy("Test Token", "TEST");
      
      await expect(
        cryptoExchange.connect(user1).addAsset(
          await newToken.getAddress(),
          "Test Asset",
          10000000000 // $100 equivalent
        )
      ).to.be.revertedWith("OwnableUnauthorizedAccount");
    });
  });

  describe("Basic Functionality", function () {
    it("Should allow users to deposit ETH", async function () {
      const depositAmount = ethers.parseEther("1");
      
      await expect(() =>
        cryptoExchange.connect(user1).depositEth({ value: depositAmount })
      )
        .to.changeEtherBalance(user1, -depositAmount);

      const userBalance = await cryptoExchange.getUserEthBalance(user1.address);
      expect(userBalance).to.equal(depositAmount);
    });

    it("Should allow users to withdraw ETH", async function () {
      const depositAmount = ethers.parseEther("1");
      const withdrawAmount = ethers.parseEther("0.5");
      
      // Deposit first
      await cryptoExchange.connect(user1).depositEth({ value: depositAmount });
      
      // Check initial balance
      const initialBalance = await ethers.provider.getBalance(user1.address);
      
      // Withdraw
      await expect(cryptoExchange.connect(user1).withdrawEth(withdrawAmount))
        .to.emit(cryptoExchange, "EthWithdrawn");

      const contractBalance = await cryptoExchange.getUserEthBalance(user1.address);
      expect(contractBalance).to.equal(depositAmount - withdrawAmount);
    });

    it("Should allow users to buy tokens", async function () {
      const buyAmount = MIN_TRADE_AMOUNT * 100; // Above min amount
      // Calculate expected cost: price * amount / 10^8, plus 0.1% fee
      const expectedCost = Math.floor((INITIAL_PRICE * buyAmount) / (10**8));
      const fee = Math.floor((expectedCost * 1) / 1000); // 0.1% fee
      const totalCost = expectedCost + fee;
      
      await expect(
        cryptoExchange
          .connect(user1)
          .buyTokens(await wethToken.getAddress(), buyAmount, { value: totalCost })
      )
        .to.emit(cryptoExchange, "TokensBought");
      
      const userBalance = await cryptoExchange.getUserAssetBalance(
        user1.address,
        await wethToken.getAddress()
      );
      expect(userBalance).to.equal(buyAmount);
    });

    it("Should allow users to sell tokens", async function () {
      // First buy some tokens
      const buyAmount = MIN_TRADE_AMOUNT * 100;
      const buyCost = Math.floor(((INITIAL_PRICE * buyAmount) / (10**8)) * 1001 / 1000); // Including fee
      
      await cryptoExchange
        .connect(user1)
        .buyTokens(await wethToken.getAddress(), buyAmount, { value: buyCost });
      
      // Now sell them
      const sellAmount = Math.floor(buyAmount / 2); // Sell half
      const expectedValue = Math.floor((INITIAL_PRICE * sellAmount) / (10**8));
      const fee = Math.floor((expectedValue * 1) / 1000);
      const netValue = expectedValue - fee;
      
      await expect(
        cryptoExchange
          .connect(user1)
          .sellTokens(await wethToken.getAddress(), sellAmount)
      )
        .to.emit(cryptoExchange, "TokensSold");
      
      const newUserBalance = await cryptoExchange.getUserAssetBalance(
        user1.address,
        await wethToken.getAddress()
      );
      expect(newUserBalance).to.equal(buyAmount - sellAmount);
    });

    it("Should enforce minimum trade amounts", async function () {
      await expect(
        cryptoExchange
          .connect(user1)
          .buyTokens(await wethToken.getAddress(), Math.floor(MIN_TRADE_AMOUNT / 2), { value: ethers.parseEther("1") })
      ).to.be.reverted;
    });
  });
});