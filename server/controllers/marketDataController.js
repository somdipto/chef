const MarketDataService = require('../services/marketDataService');
const marketService = new MarketDataService();

const getCurrentPrices = async (req, res) => {
  try {
    // Get specific coins from query parameters or use defaults
    const coins = req.query.coins ? req.query.coins.split(',') : ['bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot'];
    
    const prices = await marketService.getCurrentPrices(coins);
    
    res.status(200).json({
      success: true,
      data: prices,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in getCurrentPrices:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getOHLCV = async (req, res) => {
  try {
    const { pair } = req.params;
    const { interval = '1h', limit = 100 } = req.query;
    
    // Convert pair format (e.g., 'ETH/USDC' to 'ETHUSDT')
    const binancePair = pair.replace('/', '').toUpperCase();
    
    const data = await marketService.getOHLCV(binancePair, interval, limit);
    
    res.status(200).json({
      success: true,
      data,
      pair,
      interval,
      limit,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in getOHLCV:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getTradingPairs = async (req, res) => {
  try {
    const pairs = await marketService.getTradingPairs();
    
    // Filter to only return pairs we want to trade
    const tradingPairs = pairs
      .filter(pair => ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'MATICUSDT', 'LINKUSDT'].includes(pair.symbol))
      .map(pair => ({
        symbol: pair.symbol,
        base: pair.baseAsset,
        quote: pair.quoteAsset,
        pair: `${pair.baseAsset}/${pair.quoteAsset}`
      }));
    
    res.status(200).json({
      success: true,
      data: tradingPairs,
      total: tradingPairs.length
    });
  } catch (error) {
    console.error('Error in getTradingPairs:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getDEXes = async (req, res) => {
  try {
    // Return the list of supported DEXes
    const dexes = [
      { id: 'uniswap', name: 'Uniswap V3', fee: 0.003, url: 'https://uniswap.org' },
      { id: 'sushiswap', name: 'SushiSwap', fee: 0.003, url: 'https://sushi.com' },
      { id: 'pancakeswap', name: 'PancakeSwap', fee: 0.0025, url: 'https://pancakeswap.finance' },
      { id: 'curve', name: 'Curve Finance', fee: 0.0004, url: 'https://curve.fi' },
      { id: 'balancer', name: 'Balancer', fee: 0.0025, url: 'https://balancer.fi' }
    ];
    
    res.status(200).json({
      success: true,
      data: dexes,
      total: dexes.length
    });
  } catch (error) {
    console.error('Error in getDEXes:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// New endpoints for additional market data
const getTrendingCoins = async (req, res) => {
  try {
    const trending = await marketService.getTrendingCoins();
    
    res.status(200).json({
      success: true,
      data: trending,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in getTrendingCoins:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getGlobalMarketData = async (req, res) => {
  try {
    const globalData = await marketService.getGlobalMarketData();
    
    res.status(200).json({
      success: true,
      data: globalData,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in getGlobalMarketData:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getCoinInfo = async (req, res) => {
  try {
    const { coinId } = req.params;
    const coinInfo = await marketService.getCoinInfo(coinId);
    
    res.status(200).json({
      success: true,
      data: coinInfo,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in getCoinInfo:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getOrderBook = async (req, res) => {
  try {
    const { pair } = req.params;
    const { limit = 100 } = req.query;
    
    // Convert pair format (e.g., 'ETH/USDC' to 'ETHUSDT')
    const binancePair = pair.replace('/', '').toUpperCase();
    
    const orderBook = await marketService.getOrderBook(binancePair, limit);
    
    res.status(200).json({
      success: true,
      data: orderBook,
      pair,
      limit,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in getOrderBook:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getCurrentPrices,
  getOHLCV,
  getTradingPairs,
  getDEXes,
  getTrendingCoins,
  getGlobalMarketData,
  getCoinInfo,
  getOrderBook
};