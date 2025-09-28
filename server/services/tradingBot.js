const TradingAlgorithms = require('./tradingAlgorithms');
const DEXAggregator = require('./dexAggregator');
const MarketDataService = require('./marketDataService');
const axios = require('axios');
const cron = require('node-cron');

class TradingBot {
  constructor() {
    this.tradingAlgorithms = new TradingAlgorithms();
    this.dexAggregator = new DEXAggregator();
    this.marketDataService = new MarketDataService();
    this.isRunning = false;
    this.configuration = {
      strategy: 'combined', // mean_reversion, momentum, neural_network, combined
      riskLevel: 'medium', // low, medium, high
      maxPositionSize: 0.1, // 10% of portfolio
      stopLoss: 0.05, // 5%
      takeProfit: 0.1, // 10%
      tradingPairs: ['ETH/USDC', 'BTC/USDC'],
      tradingFrequency: 'high', // low (every 30 min), medium (every 10 min), high (every 5 min)
      slippage: 0.5, // 0.5% slippage tolerance
    };
    
    // Mock wallet and account info
    this.account = {
      balance: 10000, // $10,000 in base currency
      positions: [],
      trades: []
    };
  }

  // Start the trading bot
  start() {
    if (this.isRunning) {
      console.log('Bot is already running');
      return;
    }

    this.isRunning = true;
    console.log('Trading bot started');
    
    // Schedule trading based on frequency
    let cronSchedule;
    switch (this.configuration.tradingFrequency) {
      case 'low':
        cronSchedule = '*/30 * * * *'; // Every 30 minutes
        break;
      case 'medium':
        cronSchedule = '*/10 * * * *'; // Every 10 minutes
        break;
      case 'high':
        cronSchedule = '*/5 * * * *'; // Every 5 minutes
        break;
      default:
        cronSchedule = '*/10 * * * *'; // Default to medium
    }

    // Schedule the main trading cycle
    this.tradingTask = cron.schedule(cronSchedule, () => {
      this.executeTradingCycle();
    });

    console.log(`Trading cycle scheduled with frequency: ${this.configuration.tradingFrequency}`);
    
    // Execute initial cycle
    this.executeTradingCycle();
  }

  // Stop the trading bot
  stop() {
    if (!this.isRunning) {
      console.log('Bot is not running');
      return;
    }

    this.isRunning = false;
    if (this.tradingTask) {
      this.tradingTask.stop();
    }
    console.log('Trading bot stopped');
  }

  // Main trading cycle
  async executeTradingCycle() {
    if (!this.isRunning) return;

    console.log(`Starting trading cycle at ${new Date().toISOString()}`);
    
    try {
      // Iterate through each trading pair
      for (const pair of this.configuration.tradingPairs) {
        await this.analyzeAndTrade(pair);
      }
      
      // Check existing positions for take profit or stop loss
      await this.checkPositionExitConditions();
      
      console.log('Trading cycle completed');
    } catch (error) {
      console.error('Error in trading cycle:', error);
    }
  }

  // Analyze market and execute trade if conditions are met
  async analyzeAndTrade(pair) {
    try {
      console.log(`Analyzing ${pair}...`);
      
      // Get market data for the pair
      const marketData = await this.getMarketData(pair);
      if (!marketData || marketData.prices.length < 20) {
        console.log(`Insufficient market data for ${pair}`);
        return;
      }

      // Get trading signal
      const signalResult = await this.tradingAlgorithms.getTradingSignal(
        marketData.prices, 
        this.configuration.strategy
      );
      
      const { signal, indicators } = signalResult;
      console.log(`${pair} signal: ${signal}`, { rsi: indicators.rsi, macd: indicators.macd?.MACD });
      
      // Check if we should trade based on the signal
      if (signal === 'BUY' || signal === 'SELL') {
        // Check if we already have a position in this pair
        const existingPosition = this.account.positions.find(p => p.pair === pair);
        
        if (existingPosition) {
          // If we have a position and the signal is opposite, consider closing
          if ((existingPosition.isLong && signal === 'SELL') || 
              (!existingPosition.isLong && signal === 'BUY')) {
            console.log(`Closing position in ${pair} based on opposite signal`);
            await this.closePosition(existingPosition);
          }
          // If same signal, we might want to add to position (depending on strategy)
          // For now, we'll skip if we already have a position
          else {
            console.log(`Already have position in ${pair}, skipping`);
            return;
          }
        }
        
        // Calculate position size based on risk management
        const positionSize = this.calculatePositionSize(
          pair,
          signal === 'BUY',
          marketData.currentPrice
        );
        
        if (positionSize > 0) {
          console.log(`Executing ${signal} trade for ${pair}, size: ${positionSize}`);
          
          // Execute the trade
          await this.executeTrade(pair, signal, positionSize, marketData.currentPrice);
        }
      }
    } catch (error) {
      console.error(`Error analyzing ${pair}:`, error);
    }
  }

  // Execute a trade
  async executeTrade(pair, signal, size, price) {
    try {
      // Determine token pair
      const [baseToken, quoteToken] = pair.split('/');
      
      // Determine which token we're buying/selling
      let tokenIn, tokenOut, amountIn;
      if (signal === 'BUY') {
        tokenIn = quoteToken;  // e.g., USDC
        tokenOut = baseToken;  // e.g., ETH
        amountIn = size * price;  // How much quote token to spend
      } else { // SELL
        tokenIn = baseToken;   // e.g., ETH
        tokenOut = quoteToken; // e.g., USDC
        amountIn = size;       // How much base token to sell
      }
      
      // Get the best DEX for this trade
      const bestQuote = await this.dexAggregator.getBestDEX(
        `0x${tokenIn.toLowerCase()}`, // In a real implementation, these would be actual token addresses
        `0x${quoteToken.toLowerCase()}`,
        amountIn,
        this.configuration.slippage
      );
      
      console.log(`Best DEX for ${pair} trade: ${bestQuote.dex.name}`);
      
      // Execute the trade
      const result = await this.dexAggregator.executeTrade(
        bestQuote,
        this.account.wallet, // Mock wallet
        this.configuration.slippage
      );
      
      if (result.success) {
        console.log(`Trade executed successfully: ${signal} ${size} ${baseToken} at ${price}`);
        
        // Create position if it's a new position
        if (signal === 'BUY') {
          this.createPosition(pair, size, price, true); // isLong: true
        } else if (signal === 'SELL') {
          // For short selling, create a short position
          this.createPosition(pair, size, price, false); // isLong: false
        }
        
        // Record the trade
        this.recordTrade(pair, signal, size, price, result.transactionHash);
      } else {
        console.error(`Trade execution failed:`, result.error);
      }
    } catch (error) {
      console.error(`Error executing trade:`, error);
    }
  }

  // Create a new position
  createPosition(pair, size, entryPrice, isLong) {
    const position = {
      id: Date.now().toString(),
      pair,
      size,
      entryPrice,
      isLong,
      entryTime: new Date(),
      stopLoss: isLong 
        ? entryPrice * (1 - this.configuration.stopLoss) 
        : entryPrice * (1 + this.configuration.stopLoss),
      takeProfit: isLong 
        ? entryPrice * (1 + this.configuration.takeProfit) 
        : entryPrice * (1 - this.configuration.takeProfit),
      currentPrice: entryPrice,
      unrealizedPnL: 0
    };
    
    this.account.positions.push(position);
    console.log(`Created new position: ${position.pair} ${position.isLong ? 'LONG' : 'SHORT'} ${position.size} @ ${position.entryPrice}`);
  }

  // Close a position
  async closePosition(position) {
    try {
      // Calculate realized PnL
      const exitPrice = position.currentPrice;
      position.realizedPnL = position.isLong 
        ? (exitPrice - position.entryPrice) * position.size
        : (position.entryPrice - exitPrice) * position.size;
        
      position.exitTime = new Date();
      position.exitPrice = exitPrice;
      position.status = 'closed';
      
      // Record the closing trade
      const signal = position.isLong ? 'SELL' : 'BUY';
      this.recordTrade(position.pair, signal, position.size, exitPrice, '0xmock_transaction_hash');
      
      console.log(`Closed position: ${position.pair} ${position.isLong ? 'LONG' : 'SHORT'} ${position.size} @ ${exitPrice}, PnL: ${position.realizedPnL}`);
      
      // Remove position from account
      const index = this.account.positions.findIndex(p => p.id === position.id);
      if (index !== -1) {
        this.account.positions.splice(index, 1);
      }
    } catch (error) {
      console.error(`Error closing position:`, error);
    }
  }

  // Check for positions that should be closed based on stop loss/take profit
  async checkPositionExitConditions() {
    const positionsToClose = [];
    
    for (const position of this.account.positions) {
      // Update current price for this position
      try {
        const marketData = await this.getMarketData(position.pair);
        if (marketData) {
          position.currentPrice = marketData.currentPrice;
          
          // Calculate unrealized PnL
          position.unrealizedPnL = position.isLong 
            ? (position.currentPrice - position.entryPrice) * position.size
            : (position.entryPrice - position.currentPrice) * position.size;
        }
      } catch (error) {
        console.error(`Error updating position price for ${position.pair}:`, error);
        continue;
      }
      
      // Check for stop loss or take profit conditions
      if (
        this.tradingAlgorithms.shouldStopLoss(
          position.currentPrice, 
          position.entryPrice, 
          this.configuration.stopLoss, 
          position.isLong
        ) ||
        this.tradingAlgorithms.shouldTakeProfit(
          position.currentPrice, 
          position.entryPrice, 
          this.configuration.takeProfit, 
          position.isLong
        )
      ) {
        positionsToClose.push(position);
      }
    }
    
    // Close all positions that met exit conditions
    for (const position of positionsToClose) {
      await this.closePosition(position);
    }
  }

  // Calculate position size based on risk management
  calculatePositionSize(pair, isLong, currentPrice) {
    try {
      // Determine risk amount based on account balance and risk level
      let riskPercentage;
      switch (this.configuration.riskLevel) {
        case 'low':
          riskPercentage = 0.01; // 1% risk per trade
          break;
        case 'medium':
          riskPercentage = 0.02; // 2% risk per trade
          break;
        case 'high':
          riskPercentage = 0.05; // 5% risk per trade
          break;
        default:
          riskPercentage = 0.02; // Default to 2%
      }
      
      // Calculate position size based on risk
      const riskAmount = this.account.balance * this.configuration.maxPositionSize * riskPercentage;
      const stopLossDistance = currentPrice * this.configuration.stopLoss;
      
      if (stopLossDistance <= 0) {
        console.error('Invalid stop loss distance');
        return 0;
      }
      
      // For now, return a fixed size based on risk management
      // In a real implementation, you'd calculate it based on expected stop loss
      const positionSize = (riskAmount / stopLossDistance) * currentPrice;
      
      // Don't risk more than the maximum position size
      const maxSize = (this.account.balance * this.configuration.maxPositionSize) / currentPrice;
      return Math.min(positionSize, maxSize);
    } catch (error) {
      console.error(`Error calculating position size for ${pair}:`, error);
      return 0;
    }
  }

  // Get market data for a trading pair
  async getMarketData(pair) {
    try {
      // Convert pair format (e.g., 'ETH/USDC' to 'ETHUSDT' for Binance)
      const binancePair = pair.replace('/', '').replace('USDC', 'USDT');
      
      // Get OHLCV data from the market service
      const ohlcvData = await this.marketDataService.getOHLCV(binancePair, '1h', 50);
      
      // Transform the data to the format expected by the algorithms
      const prices = ohlcvData.map(candle => ({
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      }));
      
      // Get the current price
      const currentPrice = prices.length > 0 ? prices[prices.length - 1].close : null;
      
      return {
        pair,
        prices,
        currentPrice,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error getting market data for ${pair}:`, error);
      
      // Fallback to mock data if API fails
      console.log(`Using mock data for ${pair} due to API error`);
      
      // Generate mock price data (last 50 periods)
      const prices = [];
      let currentPrice = Math.random() * 2000 + 1000; // Random price between 1000-3000
      
      for (let i = 0; i < 50; i++) {
        // Add some random price movement
        const changePercent = (Math.random() - 0.5) * 0.05; // ±2.5% change
        currentPrice = currentPrice * (1 + changePercent);
        
        prices.push({
          time: Date.now() - (50 - i) * 60 * 1000, // 1 minute intervals
          open: currentPrice,
          high: currentPrice * (1 + Math.random() * 0.02),
          low: currentPrice * (1 - Math.random() * 0.02),
          close: currentPrice,
          volume: Math.random() * 1000
        });
      }
      
      return {
        pair,
        prices,
        currentPrice: prices[prices.length - 1].close,
        timestamp: new Date()
      };
    }
  }

  // Record a trade in the account history
  recordTrade(pair, signal, size, price, transactionHash) {
    const trade = {
      id: Date.now().toString(),
      pair,
      signal,
      size,
      price,
      timestamp: new Date(),
      transactionHash
    };
    
    this.account.trades.push(trade);
    
    // Update account balance based on trade (simplified)
    // In a real implementation, you'd track multiple tokens and fees
    if (signal === 'BUY') {
      this.account.balance -= size * price; // Spent money buying
    } else {
      this.account.balance += size * price; // Received money selling
    }
  }

  // Update bot configuration
  updateConfiguration(newConfig) {
    // Update only the provided configuration options
    Object.keys(newConfig).forEach(key => {
      if (this.configuration.hasOwnProperty(key)) {
        this.configuration[key] = newConfig[key];
      }
    });
    
    console.log('Bot configuration updated:', this.configuration);
  }

  // Get current status of the bot
  getStatus() {
    return {
      isRunning: this.isRunning,
      configuration: this.configuration,
      account: {
        balance: this.account.balance,
        positions: this.account.positions.length,
        trades: this.account.trades.length
      },
      timestamp: new Date()
    };
  }

  // Get trading history
  getTradeHistory() {
    return this.account.trades;
  }

  // Get current positions
  getCurrentPositions() {
    return this.account.positions;
  }
}

module.exports = TradingBot;