const WalletService = require('../services/walletService');
const walletService = new WalletService();

// Create a new wallet
const createWallet = async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password is required and must be at least 8 characters long'
      });
    }
    
    const result = await walletService.createWallet(password);
    
    res.status(201).json({
      success: true,
      data: {
        address: result.address,
        token: result.token
      },
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Import existing wallet
const importWallet = async (req, res) => {
  try {
    const { privateKey, password } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({
        success: false,
        message: 'Private key is required'
      });
    }
    
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password is required and must be at least 8 characters long'
      });
    }
    
    const result = await walletService.importWallet(privateKey, password);
    
    res.status(200).json({
      success: true,
      data: {
        address: result.address,
        token: result.token
      },
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get wallet info
const getWalletInfo = async (req, res) => {
  try {
    const walletAddress = req.walletAddress;
    
    const walletInfo = walletService.getWalletInfo(walletAddress);
    
    if (!walletInfo) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: walletInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get wallet balance
const getBalance = async (req, res) => {
  try {
    const walletAddress = req.walletAddress;
    
    // In a real implementation, you would connect to a blockchain provider
    // For this demo, we'll return a mock balance
    const balance = {
      address: walletAddress,
      balance: '1.25',
      token: 'ETH',
      valueUSD: '2187.50' // Assuming $1750 per ETH
    };
    
    res.status(200).json({
      success: true,
      data: balance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Sign transaction
const signTransaction = async (req, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { password, transaction } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to sign transaction'
      });
    }
    
    if (!transaction) {
      return res.status(400).json({
        success: false,
        message: 'Transaction parameters are required'
      });
    }
    
    // Validate transaction parameters
    const requiredParams = ['to', 'value'];
    for (const param of requiredParams) {
      if (!transaction[param]) {
        return res.status(400).json({
          success: false,
          message: `Transaction parameter '${param}' is required`
        });
      }
    }
    
    const result = await walletService.signTransaction(walletAddress, password, transaction);
    
    res.status(200).json({
      success: true,
      data: {
        signedTransaction: result.signedTransaction,
        transactionHash: result.transactionHash
      },
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createWallet,
  importWallet,
  getWalletInfo,
  getBalance,
  signTransaction
};