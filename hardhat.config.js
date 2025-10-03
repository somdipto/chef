require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
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