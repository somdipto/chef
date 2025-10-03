const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Complete Crypto Trading Platform", function () {
  let crpToken;
  let baseToken;  // USDC
  let quoteToken; // WETH
  let cryptoExchange;
  let cryptoTradingBot;
  let owner;
  let user1;
  let user2;

  const INITIAL_PRICE = 350000000000; // $3500 per ETH equivalent in our 10^8 format
  const MIN_TRADE_AMOUNT = 10**6; // Set in contract

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy CRP Governance Token
    const CRPToken = await ethers.getContractFactory("CRPToken");
    crpToken = await CRPToken.deploy();
    await crpToken.deploymentTransaction().wait(); // Wait for deployment

    // Deploy mock tokens for the exchange
    const CryptoToken = await ethers.getContractFactory("CryptoToken");
    baseToken = await CryptoToken.deploy("USD Coin", "USDC");
    await baseToken.deploymentTransaction().wait();
    
    quoteToken = await CryptoToken.deploy("Wrapped Ether", "WETH");
    await quoteToken.deploymentTransaction().wait();

    // Deploy CryptoExchange
    const CryptoExchange = await ethers.getContractFactory("CryptoExchange");
    cryptoExchange = await CryptoExchange.deploy(crpToken.target);
    await cryptoExchange.deploymentTransaction().wait();

    // Add assets to exchange
    await cryptoExchange.addAsset(
      baseToken.target, // USDC
      "USD Coin",
      10000000000 // $100 equivalent in 10^8 format
    );
    
    await cryptoExchange.addAsset(
      quoteToken.target, // WETH
      "Wrapped Ethereum", 
      INITIAL_PRICE // $3500 equivalent
    );

    // Initialize strategy parameters for the trading bot
    const strategy = {
      minBalance: ethers.parseEther("1"), // 1 ETH equivalent as minimum balance
      buyThreshold: 70, // Buy when signal is above 70
      sellThreshold: 30, // Sell when signal is below 30
      maxTradeAmount: ethers.parseEther("10"), // Max 10 ETH equivalent per trade
      stopLoss: 500, // 5% stop loss (with 2 decimal precision)
      takeProfit: 1000 // 10% take profit (with 2 decimal precision)
    };

    // Deploy CryptoTradingBot
    const CryptoTradingBot = await ethers.getContractFactory("CryptoTradingBot");
    cryptoTradingBot = await CryptoTradingBot.deploy(
      baseToken.target, // Base token (USDC)
      quoteToken.target, // Quote token (WETH)
      strategy
    );
    await cryptoTradingBot.deploymentTransaction().wait();
  });

  describe("CRPToken (Governance Token)", function () {
    it("Should have correct name and symbol", async function () {
      expect(await crpToken.name()).to.equal("Crypto Trading Platform Token");
      expect(await crpToken.symbol()).to.equal("CRP");
    });

    it("Should have correct initial supply", async function () {
      const expectedSupply = ethers.parseEther("10000000"); // 10M tokens minted to owner
      expect(await crpToken.totalSupply()).to.equal(expectedSupply);
      expect(await crpToken.balanceOf(owner.address)).to.equal(expectedSupply);
    });

    it("Should support minting functionality", async function () {
      // Check that it supports minting by owner
      const amount = ethers.parseEther("1000");
      await expect(crpToken.connect(owner).mint(user1.address, amount))
        .to.emit(crpToken, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, amount);
      
      expect(await crpToken.balanceOf(user1.address)).to.equal(amount);
    });
  });

  describe("CryptoExchange", function () {
    describe("Asset Management", function () {
      it("Should allow owner to add assets", async function () {
        const newToken = await (await ethers.getContractFactory("CryptoToken"))
          .deploy("Test Token", "TEST");
        
        await expect(
          cryptoExchange.addAsset(
            newToken.target,
            "Test Asset",
            10000000000 // $100 equivalent
          )
        )
          .to.emit(cryptoExchange, "AssetAdded")
          .withArgs(newToken.target, "Test Asset", 10000000000);
      });

      it("Should not allow non-owner to add assets", async function () {
        const newToken = await (await ethers.getContractFactory("CryptoToken"))
          .deploy("Test Token", "TEST");
        
        await expect(
          cryptoExchange.connect(user1).addAsset(
            newToken.target,
            "Test Asset",
            10000000000 // $100 equivalent
          )
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Should enforce price change limits", async function () {
        // Current price is INITIAL_PRICE, try to change it to something too different
        const excessivePrice = INITIAL_PRICE * 2; // Double the price (100% increase)
        
        await expect(
          cryptoExchange.updateAssetPrice(quoteToken.target, excessivePrice)
        ).to.be.revertedWith("Price change too large");
      });
    });

    describe("Trading Functionality", function () {
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
            .buyTokens(quoteToken.target, buyAmount, { value: totalCost })
        )
          .to.emit(cryptoExchange, "TokensBought");
        
        const userBalance = await cryptoExchange.getUserAssetBalance(
          user1.address,
          quoteToken.target
        );
        expect(userBalance).to.equal(buyAmount);
      });

      it("Should allow users to sell tokens", async function () {
        // First buy some tokens
        const buyAmount = MIN_TRADE_AMOUNT * 100;
        const buyCost = Math.floor(((INITIAL_PRICE * buyAmount) / (10**8)) * 1001 / 1000); // Including fee
        
        await cryptoExchange
          .connect(user1)
          .buyTokens(quoteToken.target, buyAmount, { value: buyCost });
        
        // Now sell them
        const sellAmount = Math.floor(buyAmount / 2); // Sell half
        const expectedValue = Math.floor((INITIAL_PRICE * sellAmount) / (10**8));
        const fee = Math.floor((expectedValue * 1) / 1000);
        const netValue = expectedValue - fee;
        
        await expect(
          cryptoExchange
            .connect(user1)
            .sellTokens(quoteToken.target, sellAmount)
        )
          .to.emit(cryptoExchange, "TokensSold");
        
        const newUserBalance = await cryptoExchange.getUserAssetBalance(
          user1.address,
          quoteToken.target
        );
        expect(newUserBalance).to.equal(buyAmount - sellAmount);
      });
    });
  });

  describe("CryptoTradingBot", function () {
    it("Should be deployed with correct parameters", async function () {
      expect(await cryptoTradingBot.baseToken()).to.equal(baseToken.target);
      expect(await cryptoTradingBot.quoteToken()).to.equal(quoteToken.target);
    });

    it("Should have correct strategy parameters", async function () {
      const strategy = await cryptoTradingBot.strategy();
      expect(strategy.minBalance).to.equal(ethers.parseEther("1"));
      expect(strategy.buyThreshold).to.equal(70);
      expect(strategy.sellThreshold).to.equal(30);
      expect(strategy.maxTradeAmount).to.equal(ethers.parseEther("10"));
      expect(strategy.stopLoss).to.equal(500);
      expect(strategy.takeProfit).to.equal(1000);
    });

    it("Should allow owner to update strategy", async function () {
      const newStrategy = {
        minBalance: ethers.parseEther("2"),
        buyThreshold: 80,
        sellThreshold: 20,
        maxTradeAmount: ethers.parseEther("20"),
        stopLoss: 600,
        takeProfit: 1200
      };

      await expect(cryptoTradingBot.updateStrategy(newStrategy))
        .to.emit(cryptoTradingBot, "StrategyUpdated");

      const updatedStrategy = await cryptoTradingBot.strategy();
      expect(updatedStrategy.minBalance).to.equal(ethers.parseEther("2"));
      expect(updatedStrategy.buyThreshold).to.equal(80);
      expect(updatedStrategy.sellThreshold).to.equal(20);
    });

    it("Should allow owner to authorize DEX", async function () {
      const dexAddress = "0x000000000000000000000000000000000000dEaD"; // Mock DEX address
      
      await expect(cryptoTradingBot.setAuthorizedDex(dexAddress, true))
        .to.emit(cryptoTradingBot, "DEXAuthorized")
        .withArgs(dexAddress, true);

      expect(await cryptoTradingBot.authorizedDexs(dexAddress)).to.equal(true);
    });

    it("Should track positions correctly", async function () {
      expect(await cryptoTradingBot.getPositionCount()).to.equal(0);
    });
  });

  describe("Integration", function () {
    it("Should allow the trading bot to interact with exchange tokens", async function () {
      // Transfer some tokens to the trading bot contract to simulate trading operations
      await baseToken.transfer(cryptoTradingBot.target, ethers.parseEther("1000"));
      await quoteToken.transfer(cryptoTradingBot.target, ethers.parseEther("10"));

      // Verify the trading bot has the tokens
      expect(await baseToken.balanceOf(cryptoTradingBot.target)).to.equal(ethers.parseEther("1000"));
      expect(await quoteToken.balanceOf(cryptoTradingBot.target)).to.equal(ethers.parseEther("10"));
    });
  });
});