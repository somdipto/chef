require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    // Add other networks like mainnet, goerli, etc. when deploying
  },
  etherscan: {
    apiKey: {
      // Add your Etherscan API key when deploying to mainnet
    }
  }
};