// demo-api-integration.js - Demonstration of API integrations

const MarketDataService = require('./server/services/marketDataService');

async function demoAPIIntegrations() {
  console.log('🔌 Demonstrating API Integrations...\n');
  
  const marketService = new MarketDataService();
  
  try {
    // Test 1: Get current prices
    console.log('✅ Fetching current prices...');
    const prices = await marketService.getCurrentPrices(['bitcoin', 'ethereum', 'solana']);
    console.log(`   Bitcoin: $${prices.bitcoin.usd}`);
    console.log(`   Ethereum: $${prices.ethereum.usd}`);
    console.log(`   Solana: $${prices.solana.usd}\n`);
    
    // Test 2: Get OHLCV data
    console.log('✅ Fetching OHLCV data for BTCUSDT...');
    const ohlcv = await marketService.getOHLCV('BTCUSDT', '1h', 5);
    console.log('   Recent BTC/USDT hourly candles:');
    for (const candle of ohlcv.slice(0, 3)) { // Show first 3
      console.log(`     Time: ${new Date(candle.time).toISOString()}, Open: $${candle.open}, Close: $${candle.close}`);
    }
    console.log('');
    
    // Test 3: Get trading pairs
    console.log('✅ Fetching available trading pairs...');
    const pairs = await marketService.getTradingPairs();
    const topPairs = pairs.slice(0, 5);
    console.log('   Top 5 trading pairs on Binance:');
    for (const pair of topPairs) {
      console.log(`     ${pair.symbol} (${pair.baseAsset}/${pair.quoteAsset})`);
    }
    console.log('');
    
    // Test 4: Get order book
    console.log('✅ Fetching order book for ETHUSDT...');
    const orderBook = await marketService.getOrderBook('ETHUSDT', 5);
    console.log('   Top 3 bids:');
    for (const bid of orderBook.bids.slice(0, 3)) {
      console.log(`     Price: $${bid[0]}, Amount: ${bid[1]}`);
    }
    console.log('   Top 3 asks:');
    for (const ask of orderBook.asks.slice(0, 3)) {
      console.log(`     Price: $${ask[0]}, Amount: ${ask[1]}`);
    }
    console.log('');
    
    // Test 5: Get trending coins
    console.log('✅ Fetching trending coins...');
    const trending = await marketService.getTrendingCoins();
    if (trending?.coins && trending.coins.length > 0) {
      console.log('   Top 3 trending coins:');
      for (let i = 0; i < Math.min(3, trending.coins.length); i++) {
        console.log(`     ${trending.coins[i].item.name} (${trending.coins[i].item.symbol.toUpperCase()})`);
      }
    }
    console.log('');
    
    // Test 6: Get global market data
    console.log('✅ Fetching global market data...');
    const globalData = await marketService.getGlobalMarketData();
    if (globalData?.data) {
      console.log(`   Total Market Cap: $${globalData.data.total_market_cap.usd.toLocaleString()}`);
      console.log(`   24h Volume: $${globalData.data.total_volume.usd.toLocaleString()}`);
      console.log(`   Bitcoin Dominance: ${globalData.data.market_cap_percentage.btc.toFixed(2)}%`);
    }
    console.log('');
    
    console.log('🎉 All API integrations working successfully!');
    console.log('\n📈 The system is now connected to real market data sources:');
    console.log('   • CoinGecko for comprehensive crypto data and trending information');
    console.log('   • Binance for real-time pricing, OHLCV data, and order book information');
    console.log('   • Direct market data feeds for trading decisions');
    console.log('\n🚀 The crypto trading bot can now make informed decisions based on real market data!');
    
  } catch (error) {
    console.error('❌ Error in API integration demo:', error.message);
    console.log('\n💡 Note: API keys may need to be configured in .env file for full functionality');
  }
}

// Run the demo
demoAPIIntegrations();