const ti = require('technicalindicators');
const axios = require('axios');

class TradingAlgorithms {
  constructor() {
    // For now, we'll skip the neural network implementation due to dependency issues
    // In a production environment, you might want to use a simpler ML approach
    // or a different library that doesn't require native compilation
  }

  // Technical analysis indicators
  calculateRSI(prices, period = 14) {
    const rsiInput = {
      values: prices,
      period: period
    };
    return ti.RSI.calculate(rsiInput);
  }

  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const macdInput = {
      values: prices,
      fastPeriod: fastPeriod,
      slowPeriod: slowPeriod,
      signalPeriod: signalPeriod
    };
    return ti.MACD.calculate(macdInput);
  }

  calculateMovingAverage(prices, period) {
    const maInput = {
      values: prices,
      period: period
    };
    return ti.SMA.calculate(maInput);
  }

  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    const bbInput = {
      values: prices,
      period: period,
      stdDev: stdDev
    };
    return ti.BollingerBands.calculate(bbInput);
  }

  calculateStochastic(prices, kPeriod = 14, dPeriod = 3, slowing = 3) {
    // This is a simplified implementation
    // In a real implementation, you'd need high/low prices as well
    const highestHigh = Math.max(...prices.slice(-kPeriod));
    const lowestLow = Math.min(...prices.slice(-kPeriod));
    const currentClose = prices[prices.length - 1];
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    // Simplified D calculation
    const d = k; // In reality, this should be a moving average of K
    
    return { k, d };
  }

  // Trading strategies
  meanReversionStrategy(prices, movingAverage, bollingerBands) {
    const currentPrice = prices[prices.length - 1];
    const currentMA = movingAverage[movingAverage.length - 1];
    
    // Check if bollingerBands has valid data
    if (!bollingerBands || bollingerBands.length === 0) {
      return 'HOLD';
    }
    
    const currentBB = bollingerBands[bollingerBands.length - 1];
    
    // Check if currentBB has the required properties
    if (!currentBB || currentBB.lower === undefined || currentBB.upper === undefined) {
      return 'HOLD';
    }
    
    // Buy when price is below lower band and near mean
    if (currentPrice < currentBB.lower && currentPrice > currentMA) {
      return 'BUY';
    }
    // Sell when price is above upper band and near mean
    else if (currentPrice > currentBB.upper && currentPrice < currentMA) {
      return 'SELL';
    }
    
    return 'HOLD';
  }

  momentumStrategy(rsi, macd) {
    // Buy when RSI is oversold and MACD is bullish
    if (rsi[rsi.length - 1] < 30 && macd[macd.length - 1].MACD > macd[macd.length - 1].signal) {
      return 'BUY';
    }
    // Sell when RSI is overbought and MACD is bearish
    else if (rsi[rsi.length - 1] > 70 && macd[macd.length - 1].MACD < macd[macd.length - 1].signal) {
      return 'SELL';
    }
    
    return 'HOLD';
  }

  // Simplified price prediction without neural network
  predictPrice(prices) {
    // Simple prediction based on recent price movements
    const recentPrices = prices.slice(-5); // Look at last 5 prices
    
    // Calculate if the trend is up or down
    let upCount = 0;
    let downCount = 0;
    
    for (let i = 1; i < recentPrices.length; i++) {
      if (recentPrices[i] > recentPrices[i-1]) {
        upCount++;
      } else if (recentPrices[i] < recentPrices[i-1]) {
        downCount++;
      }
    }
    
    if (upCount > downCount) {
      return 'UP';
    } else if (downCount > upCount) {
      return 'DOWN';
    } else {
      return 'NEUTRAL';
    }
  }

  // Risk management functions
  calculatePositionSize(accountBalance, riskPercentage, entryPrice, stopLossPrice) {
    // Calculate position size based on risk management
    const riskAmount = accountBalance * riskPercentage;
    const priceDifference = Math.abs(entryPrice - stopLossPrice);
    const positionSize = riskAmount / priceDifference;
    
    return positionSize;
  }

  shouldTakeProfit(currentPrice, entryPrice, takeProfitPercentage, isLong) {
    if (isLong) {
      // For long positions, check if we've reached take profit target
      return currentPrice >= entryPrice * (1 + takeProfitPercentage);
    } else {
      // For short positions, check if we've reached take profit target
      return currentPrice <= entryPrice * (1 - takeProfitPercentage);
    }
  }

  shouldStopLoss(currentPrice, entryPrice, stopLossPercentage, isLong) {
    if (isLong) {
      // For long positions, check if we've hit stop loss
      return currentPrice <= entryPrice * (1 - stopLossPercentage);
    } else {
      // For short positions, check if we've hit stop loss
      return currentPrice >= entryPrice * (1 + stopLossPercentage);
    }
  }

  // Main trading decision function
  async getTradingSignal(prices, strategy = 'mean_reversion') {
    // Calculate technical indicators
    const movingAverage = this.calculateMovingAverage(prices, 20);
    const rsi = this.calculateRSI(prices, 14);
    const macd = this.calculateMACD(prices, 12, 26, 9);
    const bollingerBands = this.calculateBollingerBands(prices, 20, 2);
    const stochastic = this.calculateStochastic(prices);
    
    let signal = 'HOLD';
    
    switch (strategy) {
      case 'mean_reversion':
        signal = this.meanReversionStrategy(prices, movingAverage, bollingerBands);
        break;
      case 'momentum':
        signal = this.momentumStrategy(rsi, macd);
        break;
      case 'neural_network':
        // Use simplified prediction based on recent price movements
        const nnPrediction = this.predictPrice(prices.map(p => p.close));
        if (nnPrediction === 'UP') signal = 'BUY';
        else if (nnPrediction === 'DOWN') signal = 'SELL';
        else signal = 'HOLD';
        break;
      default:
        // Combine multiple strategies
        const mrSignal = this.meanReversionStrategy(prices, movingAverage, bollingerBands);
        const momSignal = this.momentumStrategy(rsi, macd);
        
        // If both strategies agree, follow the signal
        if (mrSignal === momSignal) {
          signal = mrSignal;
        } else if (mrSignal !== 'HOLD') {
          signal = mrSignal;
        } else {
          signal = momSignal;
        }
    }
    
    return {
      signal,
      indicators: {
        rsi: rsi[rsi.length - 1],
        macd: macd[macd.length - 1],
        movingAverage: movingAverage[movingAverage.length - 1],
        bollingerBands: bollingerBands[bollingerBands.length - 1],
        stochastic
      }
    };
  }
}

module.exports = TradingAlgorithms;