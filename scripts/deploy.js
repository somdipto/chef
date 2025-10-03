const { ethers } = require("hardhat");

async function main() {
  // Deploy CRP Governance Token first
  console.log("Deploying CRP Governance Token...");
  const CRPToken = await ethers.getContractFactory("CRPToken");
  const crpToken = await CRPToken.deploy();
  await crpToken.deployed();
  console.log("CRP Token deployed to:", crpToken.address);

  // Deploy mock tokens for the trading bot (for testing purposes)
  console.log("Deploying mock tokens for trading bot...");
  const CryptoToken = await ethers.getContractFactory("CryptoToken");
  const baseToken = await CryptoToken.deploy("USD Coin", "USDC");
  await baseToken.deployed();
  console.log("Base token (USDC) deployed to:", baseToken.address);

  const quoteToken = await CryptoToken.deploy("Wrapped Ether", "WETH");
  await quoteToken.deployed();
  console.log("Quote token (WETH) deployed to:", quoteToken.address);

  // Initialize strategy parameters
  const strategy = {
    minBalance: ethers.utils.parseEther("1"), // 1 ETH equivalent as minimum balance
    buyThreshold: 70, // Buy when signal is above 70
    sellThreshold: 30, // Sell when signal is below 30
    maxTradeAmount: ethers.utils.parseEther("10"), // Max 10 ETH equivalent per trade
    stopLoss: 500, // 5% stop loss (with 2 decimal precision)
    takeProfit: 1000 // 10% take profit (with 2 decimal precision)
  };

  console.log("Deploying CryptoTradingBot contract...");
  
  const CryptoTradingBot = await ethers.getContractFactory("CryptoTradingBot");
  const cryptoTradingBot = await CryptoTradingBot.deploy(
    baseToken.address, // Base token
    quoteToken.address, // Quote token
    strategy
  );

  await cryptoTradingBot.deployed();

  console.log("CryptoTradingBot deployed to:", cryptoTradingBot.address);

  // Deploy CryptoExchange
  console.log("Deploying CryptoExchange contract...");
  
  const CryptoExchange = await ethers.getContractFactory("CryptoExchange");
  const cryptoExchange = await CryptoExchange.deploy(crpToken.address);

  await cryptoExchange.deployed();

  console.log("CryptoExchange deployed to:", cryptoExchange.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });