const jwt = require('jsonwebtoken');
const WalletService = require('../services/walletService');

const walletService = new WalletService();

// Middleware to authenticate user with JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret_for_demo', (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    
    req.walletAddress = decoded.walletAddress;
    next();
  });
};

// Middleware to validate request body
const validateBody = (req, res, next) => {
  // Check for common attack patterns in request body
  const bodyStr = JSON.stringify(req.body);
  
  // Simple validation to prevent basic attacks
  if (bodyStr.includes('0x' + '00'.repeat(10))) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid request format' 
    });
  }
  
  next();
};

// Middleware to prevent replay attacks
const preventReplay = (req, res, next) => {
  // In a production environment, you'd store request hashes in a cache
  // to prevent the same request from being processed multiple times
  req.requestId = req.headers['x-request-id'] || Date.now().toString();
  next();
};

// Rate limiting middleware (simplified)
const rateLimit = (req, res, next) => {
  // In a real app, use a proper rate limiter with Redis or similar
  // This is a simplified version that just tracks by IP
  if (!req.app.locals.rateLimit) {
    req.app.locals.rateLimit = new Map();
  }
  
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // Max requests per window
  
  if (!req.app.locals.rateLimit.has(clientIP)) {
    req.app.locals.rateLimit.set(clientIP, []);
  }
  
  const requests = req.app.locals.rateLimit.get(clientIP);
  const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
  
  if (validRequests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded. Please try again later.'
    });
  }
  
  validRequests.push(now);
  req.app.locals.rateLimit.set(clientIP, validRequests);
  
  next();
};

// Sanitize user inputs
const sanitizeInputs = (req, res, next) => {
  // Sanitize and validate various inputs
  if (req.body.address) {
    req.body.address = req.body.address.trim();
    if (!ethers.utils.isAddress(req.body.address)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Ethereum address format'
      });
    }
  }
  
  if (req.body.amount) {
    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }
    req.body.amount = amount;
  }
  
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
  
  next();
};

module.exports = {
  authenticateToken,
  validateBody,
  preventReplay,
  rateLimit,
  sanitizeInputs,
  securityHeaders
};