const TradingBot = require('../services/tradingBot');

// Initialize the trading bot
const tradingBot = new TradingBot();

const getStatus = async (req, res) => {
  try {
    const status = tradingBot.getStatus();
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateConfig = async (req, res) => {
  try {
    const updates = req.body;
    
    // Update bot configuration
    tradingBot.updateConfiguration(updates);
    
    const status = tradingBot.getStatus();
    
    res.status(200).json({
      success: true,
      data: status,
      message: 'Bot configuration updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const startBot = async (req, res) => {
  try {
    tradingBot.start();
    
    const status = tradingBot.getStatus();
    
    res.status(200).json({
      success: true,
      data: status,
      message: 'Bot started successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const stopBot = async (req, res) => {
  try {
    tradingBot.stop();
    
    const status = tradingBot.getStatus();
    
    res.status(200).json({
      success: true,
      data: status,
      message: 'Bot stopped successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getStrategies = async (req, res) => {
  try {
    // Define available strategies
    const strategies = [
      {
        id: 'mean_reversion',
        name: 'Mean Reversion',
        description: 'Buys when price is below moving average, sells when above',
        parameters: {
          movingAverage: 20,
          deviationThreshold: 2
        }
      },
      {
        id: 'momentum',
        name: 'Momentum',
        description: 'Follows price trends and momentum indicators',
        parameters: {
          rsiPeriod: 14,
          rsiThreshold: 70
        }
      },
      {
        id: 'neural_network',
        name: 'Neural Network',
        description: 'AI-powered price prediction using neural networks',
        parameters: {
          lookbackPeriod: 50,
          hiddenLayers: [10, 10]
        }
      },
      {
        id: 'combined',
        name: 'Combined Strategy',
        description: 'Uses multiple indicators and strategies together',
        parameters: {
          weightTechnical: 0.4,
          weightNeural: 0.4,
          weightSentiment: 0.2
        }
      }
    ];
    
    res.status(200).json({
      success: true,
      data: strategies,
      total: strategies.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// For this implementation, we'll return 404 for adding, updating, or deleting strategies
// since strategies are predefined in the service
const addStrategy = async (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Strategy addition not available. Use predefined strategies.'
  });
};

const updateStrategy = async (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Strategy update not available. Use configuration parameters instead.'
  });
};

const deleteStrategy = async (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Strategy deletion not available for predefined strategies.'
  });
};

module.exports = {
  getStatus,
  updateConfig,
  startBot,
  stopBot,
  getStrategies,
  addStrategy,
  updateStrategy,
  deleteStrategy
};