const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');

router.route('/')
  .get(botController.getStatus)
  .post(botController.updateConfig);

router.route('/start')
  .post(botController.startBot);

router.route('/stop')
  .post(botController.stopBot);

router.route('/strategies')
  .get(botController.getStrategies)
  .post(botController.addStrategy);

router.route('/strategies/:id')
  .put(botController.updateStrategy)
  .delete(botController.deleteStrategy);

module.exports = router;