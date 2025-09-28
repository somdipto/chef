const { ethers } = require("hardhat");

async function main() {
  // This would be the addresses of actual tokens on the network
  // Using placeholder addresses here
  const DUMMY_TOKEN_1 = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Placeholder
  const DUMMY_TOKEN_2 = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Placeholder

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
    DUMMY_TOKEN_1, // Base token
    DUMMY_TOKEN_2, // Quote token
    strategy
  );

  await cryptoTradingBot.deployed();

  console.log("CryptoTradingBot deployed to:", cryptoTradingBot.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });