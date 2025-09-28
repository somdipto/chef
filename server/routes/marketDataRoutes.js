const express = require('express');
const router = express.Router();
const marketDataController = require('../controllers/marketDataController');

router.route('/prices')
  .get(marketDataController.getCurrentPrices);

router.route('/ohlcv/:pair')
  .get(marketDataController.getOHLCV);

router.route('/pairs')
  .get(marketDataController.getTradingPairs);

router.route('/dexes')
  .get(marketDataController.getDEXes);

router.route('/trending')
  .get(marketDataController.getTrendingCoins);

router.route('/global')
  .get(marketDataController.getGlobalMarketData);

router.route('/coin/:coinId')
  .get(marketDataController.getCoinInfo);

router.route('/orderbook/:pair')
  .get(marketDataController.getOrderBook);

module.exports = router;