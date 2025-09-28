const express = require('express');
const router = express.Router();
const { 
  createWallet, 
  importWallet, 
  getWalletInfo, 
  getBalance,
  signTransaction 
} = require('../controllers/walletController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.route('/create').post(createWallet);
router.route('/import').post(importWallet);

// Private routes (require authentication)
router.route('/info').get(authenticateToken, getWalletInfo);
router.route('/balance').get(authenticateToken, getBalance);
router.route('/sign-transaction').post(authenticateToken, signTransaction);

module.exports = router;