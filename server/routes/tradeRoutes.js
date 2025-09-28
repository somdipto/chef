const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');

router.route('/')
  .post(tradeController.executeTrade)
  .get(tradeController.getTrades);

router.route('/stats')
  .get(tradeController.getStats);

router.route('/positions')
  .get(tradeController.getPositions)
  .post(tradeController.openPosition);

router.route('/positions/:id')
  .delete(tradeController.closePosition);

module.exports = router;