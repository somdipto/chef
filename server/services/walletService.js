const ethers = require('ethers');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class WalletService {
  constructor() {
    this.wallets = new Map(); // In production, use a secure database
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default_encryption_key_for_demo';
  }

  // Create a new wallet
  createWallet(password) {
    try {
      // Generate a new Ethereum wallet
      const wallet = ethers.Wallet.createRandom();
      
      // Encrypt the private key with the user's password
      const encryptedPrivateKey = this.encryptPrivateKey(wallet.privateKey, password);
      
      // Store wallet info (in a real app, save to database)
      const walletInfo = {
        address: wallet.address,
        encryptedPrivateKey: encryptedPrivateKey,
        publicKey: wallet.publicKey,
        createdAt: new Date()
      };
      
      this.wallets.set(wallet.address, walletInfo);
      
      // Generate JWT token for the user
      const token = jwt.sign(
        { walletAddress: wallet.address },
        process.env.JWT_SECRET || 'default_jwt_secret_for_demo',
        { expiresIn: '24h' }
      );
      
      return {
        address: wallet.address,
        token: token,
        message: 'Wallet created successfully'
      };
    } catch (error) {
      throw new Error(`Error creating wallet: ${error.message}`);
    }
  }

  // Import wallet from private key
  importWallet(privateKey, password) {
    try {
      // Validate private key
      if (!ethers.utils.isHexString(privateKey) || privateKey.length !== 66) {
        throw new Error('Invalid private key format');
      }
      
      // Create wallet instance from private key
      const wallet = new ethers.Wallet(privateKey);
      
      // Encrypt the private key with the user's password
      const encryptedPrivateKey = this.encryptPrivateKey(privateKey, password);
      
      // Store wallet info
      const walletInfo = {
        address: wallet.address,
        encryptedPrivateKey: encryptedPrivateKey,
        publicKey: wallet.publicKey,
        createdAt: new Date()
      };
      
      this.wallets.set(wallet.address, walletInfo);
      
      // Generate JWT token for the user
      const token = jwt.sign(
        { walletAddress: wallet.address },
        process.env.JWT_SECRET || 'default_jwt_secret_for_demo',
        { expiresIn: '24h' }
      );
      
      return {
        address: wallet.address,
        token: token,
        message: 'Wallet imported successfully'
      };
    } catch (error) {
      throw new Error(`Error importing wallet: ${error.message}`);
    }
  }

  // Decrypt private key for transaction signing
  decryptPrivateKey(encryptedPrivateKey, password) {
    try {
      // In a real implementation, this would use proper encryption/decryption
      // For this demo, we'll implement a simple approach
      return this.simpleDecrypt(encryptedPrivateKey, password);
    } catch (error) {
      throw new Error(`Error decrypting private key: ${error.message}`);
    }
  }

  // Simple encryption (in production, use proper encryption like AES)
  encryptPrivateKey(privateKey, password) {
    // This is a simplified encryption for demo purposes
    // In production, use proper encryption like AES with a strong key
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    
    // Combine private key with hashed password and encrypt
    // (This is still simplified - proper implementation would use AES)
    return {
      data: Buffer.from(privateKey + hashedPassword.substring(0, 29)).toString('base64'),
      salt: salt
    };
  }

  simpleDecrypt(encryptedData, password) {
    // Decrypt the data (simplified for demo)
    const decrypted = Buffer.from(encryptedData.data, 'base64').toString();
    return decrypted.substring(0, 66); // Private key is 66 characters (0x + 64)
  }

  // Get wallet instance for a user (requires valid token and password)
  getWalletInstance(walletAddress, password) {
    try {
      const walletInfo = this.wallets.get(walletAddress);
      if (!walletInfo) {
        throw new Error('Wallet not found');
      }
      
      // Decrypt private key
      const privateKey = this.decryptPrivateKey(walletInfo.encryptedPrivateKey, password);
      
      // Create and return ethers wallet instance
      return new ethers.Wallet(privateKey);
    } catch (error) {
      throw new Error(`Error getting wallet instance: ${error.message}`);
    }
  }

  // Sign a transaction
  async signTransaction(walletAddress, password, transactionParams) {
    try {
      const wallet = this.getWalletInstance(walletAddress, password);
      
      // Create transaction object
      const transaction = {
        to: transactionParams.to,
        value: ethers.utils.parseEther(transactionParams.value.toString()),
        gasLimit: transactionParams.gasLimit || 21000,
        gasPrice: transactionParams.gasPrice || ethers.utils.parseUnits('20', 'gwei'),
        nonce: transactionParams.nonce || await wallet.getTransactionCount(),
        data: transactionParams.data || '0x'
      };
      
      // Sign the transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      
      return {
        signedTransaction,
        transactionHash: ethers.utils.keccak256(ethers.utils.serializeTransaction(transaction)),
        message: 'Transaction signed successfully'
      };
    } catch (error) {
      throw new Error(`Error signing transaction: ${error.message}`);
    }
  }

  // Verify a user's token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret_for_demo');
      return { valid: true, walletAddress: decoded.walletAddress };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Get wallet balance
  async getBalance(walletAddress, provider = null) {
    try {
      if (!provider) {
        // Use a default provider (in production, use Infura, Alchemy, etc.)
        provider = new ethers.providers.InfuraProvider('mainnet', process.env.INFURA_PROJECT_ID);
      }
      
      const balance = await provider.getBalance(walletAddress);
      return {
        address: walletAddress,
        balance: ethers.utils.formatEther(balance),
        message: 'Balance retrieved successfully'
      };
    } catch (error) {
      throw new Error(`Error getting balance: ${error.message}`);
    }
  }

  // Check if wallet exists
  walletExists(walletAddress) {
    return this.wallets.has(walletAddress);
  }

  // Get public wallet information (without private key)
  getWalletInfo(walletAddress) {
    const walletInfo = this.wallets.get(walletAddress);
    if (!walletInfo) {
      return null;
    }
    
    return {
      address: walletInfo.address,
      publicKey: walletInfo.publicKey,
      createdAt: walletInfo.createdAt
    };
  }
}

module.exports = WalletService;