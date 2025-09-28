const axios = require('axios');

class MarketDataService {
  constructor() {
    this.coinGeckoApiKey = process.env.COINGECKO_API_KEY;
    this.binanceApiKey = process.env.BINANCE_API_KEY;
    this.binanceSecret = process.env.BINANCE_SECRET;
    
    // Base URLs for different services
    this.coinGeckoBaseUrl = 'https://api.coingecko.com/api/v3';
    this.binanceBaseUrl = 'https://api.binance.com/api/v3';
    
    // Cache for market data to reduce API calls
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  // Get current prices from CoinGecko
  async getCurrentPrices(coins = ['bitcoin', 'ethereum', 'solana']) {
    const cacheKey = `prices_${coins.join('_')}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.coinGeckoBaseUrl}/simple/prices`, {
        params: {
          ids: coins.join(','),
          vs_currencies: 'usd'
        },
        headers: {
          'x-cg-demo-api-key': this.coinGeckoApiKey
        }
      });

      const data = response.data;
      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching prices from CoinGecko:', error.message);
      throw error;
    }
  }

  // Get historical data from CoinGecko
  async getHistoricalData(coinId = 'bitcoin', days = 30) {
    const cacheKey = `history_${coinId}_${days}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.coinGeckoBaseUrl}/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          interval: 'daily'
        },
        headers: {
          'x-cg-demo-api-key': this.coinGeckoApiKey
        }
      });

      const data = response.data;
      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching historical data from CoinGecko:', error.message);
      throw error;
    }
  }

  // Get OHLCV data from Binance
  async getOHLCV(symbol = 'BTCUSDT', interval = '1h', limit = 100) {
    const cacheKey = `ohlcv_${symbol}_${interval}_${limit}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.binanceBaseUrl}/klines`, {
        params: {
          symbol: symbol,
          interval: interval,
          limit: limit
        }
      });

      // Convert Binance data to standard format
      const formattedData = response.data.map(item => ({
        time: item[0], // Open time
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
        closeTime: item[6],
        quoteAssetVolume: parseFloat(item[7]),
        numberOfTrades: item[8],
        takerBuyBaseAssetVolume: parseFloat(item[9]),
        takerBuyQuoteAssetVolume: parseFloat(item[10])
      }));

      this.setCachedData(cacheKey, formattedData);
      return formattedData;
    } catch (error) {
      console.error('Error fetching OHLCV data from Binance:', error.message);
      throw error;
    }
  }

  // Get all available trading pairs from Binance
  async getTradingPairs() {
    const cacheKey = 'trading_pairs';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.binanceBaseUrl}/exchangeInfo`);
      const symbols = response.data.symbols
        .filter(symbol => symbol.status === 'TRADING' && symbol.quoteAsset === 'USDT')
        .map(symbol => ({
          symbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          status: symbol.status,
          filters: symbol.filters
        }));

      this.setCachedData(cacheKey, symbols);
      return symbols;
    } catch (error) {
      console.error('Error fetching trading pairs from Binance:', error.message);
      throw error;
    }
  }

  // Place order on Binance
  async placeOrder(symbol, side, type, quantity, price = null) {
    try {
      // Note: This is a simplified implementation
      // In production, you'd need to implement proper authentication and signing
      const timestamp = Date.now();
      let params = {
        symbol: symbol,
        side: side.toUpperCase(),
        type: type.toUpperCase(),
        quantity: quantity,
        timestamp: timestamp
      };

      // Add price for limit orders
      if (type.toUpperCase() === 'LIMIT' && price) {
        params.price = price;
        params.timeInForce = 'GTC';
      }

      // In a real implementation, you would sign the request with your API key
      // For this demo, we'll just return a mock response
      console.log(`Placing ${type} order: ${side} ${quantity} ${symbol} at ${price || 'market price'}`);

      return {
        orderId: Math.floor(Math.random() * 1000000),
        symbol: symbol,
        side: side,
        type: type,
        quantity: quantity,
        price: price,
        status: 'NEW',
        time: timestamp,
        message: 'Order placed successfully (demo mode)'
      };
    } catch (error) {
      console.error('Error placing order on Binance:', error.message);
      throw error;
    }
  }

  // Get account information from Binance
  async getAccountInfo() {
    try {
      // In a real implementation, you would make an authenticated API call
      // For this demo, we'll return mock account data
      return {
        balances: [
          { asset: 'BTC', free: '0.5', locked: '0.0' },
          { asset: 'ETH', free: '5.2', locked: '0.0' },
          { asset: 'USDT', free: '10000.0', locked: '0.0' },
          { asset: 'SOL', free: '25.0', locked: '0.0' }
        ],
        canTrade: true,
        canWithdraw: true,
        canDeposit: true
      };
    } catch (error) {
      console.error('Error fetching account info from Binance:', error.message);
      throw error;
    }
  }

  // Get order book for a symbol
  async getOrderBook(symbol, limit = 100) {
    const cacheKey = `orderbook_${symbol}_${limit}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.binanceBaseUrl}/depth`, {
        params: {
          symbol: symbol,
          limit: limit
        }
      });

      const data = response.data;
      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching order book from Binance:', error.message);
      throw error;
    }
  }

  // Get top trending coins from CoinGecko
  async getTrendingCoins() {
    try {
      const response = await axios.get(`${this.coinGeckoBaseUrl}/search/trending`, {
        headers: {
          'x-cg-demo-api-key': this.coinGeckoApiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching trending coins from CoinGecko:', error.message);
      throw error;
    }
  }

  // Get global crypto market data
  async getGlobalMarketData() {
    try {
      const response = await axios.get(`${this.coinGeckoBaseUrl}/global`, {
        headers: {
          'x-cg-demo-api-key': this.coinGeckoApiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching global market data from CoinGecko:', error.message);
      throw error;
    }
  }

  // Get coin info from CoinGecko
  async getCoinInfo(coinId) {
    try {
      const response = await axios.get(`${this.coinGeckoBaseUrl}/coins/${coinId}`, {
        headers: {
          'x-cg-demo-api-key': this.coinGeckoApiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching coin info for ${coinId} from CoinGecko:`, error.message);
      throw error;
    }
  }

  // Cache helper methods
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    } else if (cached) {
      this.cache.delete(key); // Remove expired cache
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

module.exports = MarketDataService;