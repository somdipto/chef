# Crypto Trading Bot

An AI-powered crypto trading bot with DEX aggregation capabilities. This system combines technical analysis, machine learning algorithms, and secure wallet integration to automatically execute trades.

## Features

- **AI Trading Algorithms**: Multiple strategies including mean reversion, momentum, and neural network prediction
- **DEX Aggregation**: Routes trades through the best available decentralized exchanges (Uniswap, SushiSwap, PancakeSwap, etc.)
- **Real-time Market Data**: Integration with CoinGecko and Binance APIs for live pricing and OHLCV data
- **Risk Management**: Stop-loss, take-profit, position sizing, and portfolio protection
- **Secure Wallet Integration**: Non-custodial wallet management with encrypted private keys
- **Real-time Dashboard**: Web-based UI for monitoring and configuration
- **Smart Contracts**: On-chain trade execution with security features

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Blockchain    │
│   (React)       │◄──►│   (Node.js)      │◄──►│   (Ethereum)    │
│                 │    │                  │    │                 │
│ - Dashboard     │    │ - Trading Engine │    │ - Trading Bot   │
│ - Trading View  │    │ - DEX Aggregator │    │   Contract      │
│ - Bot Config    │    │ - Wallet Service │    │                 │
│ - Positions     │    │ - Market Data    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd crypto-trading-bot
```

2. Install dependencies:
```bash
npm install
cd client && npm install
cd ../server && npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Configure environment variables in `.env`:
```
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/crypto-trading-bot

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Encryption
ENCRYPTION_KEY=your-super-secret-encryption-key-change-in-production

# API Keys for market data
COINGECKO_API_KEY=your_coin_gecko_api_key
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET=your_binance_secret_key

# Ethereum Network Configuration
INFURA_PROJECT_ID=your_infura_project_id
ALCHEMY_API_KEY=your_alchemy_api_key
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
```

## Running the Application

### Development Mode
```bash
# Terminal 1: Start the backend server
cd server
npm run dev

# Terminal 2: Start the frontend
cd client
npm start

# Or run both with a single command from the root
npm run dev
```

### Production Mode
```bash
# Build the frontend
cd client
npm run build

# Start the server
cd ..
npm start
```

## Usage

1. **Create/Import Wallet**: Use the wallet management API to create a new wallet or import an existing one.

2. **Configure Trading Bot**: Set your trading strategy, risk parameters, and trading pairs.

3. **Start Trading**: Enable the bot to start executing trades automatically.

4. **Monitor Performance**: Track trades, positions, and performance metrics through the dashboard.

## API Endpoints

### Wallet Management
- `POST /api/wallet/create` - Create a new wallet
- `POST /api/wallet/import` - Import existing wallet
- `GET /api/wallet/info` - Get wallet information
- `GET /api/wallet/balance` - Get wallet balance
- `POST /api/wallet/sign-transaction` - Sign a transaction

### Trading
- `POST /api/trades` - Execute a trade
- `GET /api/trades` - Get trade history
- `GET /api/trades/stats` - Get trading statistics
- `GET /api/trades/positions` - Get active positions
- `POST /api/trades/positions` - Open position
- `DELETE /api/trades/positions/:id` - Close position

### Bot Configuration
- `GET /api/bot` - Get bot status
- `POST /api/bot` - Update bot configuration
- `POST /api/bot/start` - Start the bot
- `POST /api/bot/stop` - Stop the bot
- `GET /api/bot/strategies` - Get available strategies

### Market Data
- `GET /api/market/prices` - Get current prices
- `GET /api/market/ohlcv/:pair` - Get OHLCV data
- `GET /api/market/pairs` - Get available trading pairs
- `GET /api/market/dexes` - Get available DEXes
- `GET /api/market/trending` - Get trending coins
- `GET /api/market/global` - Get global market data
- `GET /api/market/coin/:coinId` - Get specific coin information
- `GET /api/market/orderbook/:pair` - Get order book for a trading pair

## Security Features

1. **Wallet Encryption**: Private keys are encrypted with user passwords
2. **JWT Authentication**: Secure API access with token-based authentication
3. **Rate Limiting**: Protection against API abuse
4. **Input Sanitization**: Prevention of injection attacks
5. **Transaction Verification**: All transactions are validated before execution
6. **Risk Management**: Built-in stop-loss and position sizing controls

## Smart Contract

The system includes a CryptoTradingBot smart contract for secure on-chain trade execution:

- **Automated Trading**: Execute trades based on predefined strategies
- **DEX Integration**: Interact with multiple DEXes for best pricing
- **Risk Controls**: Enforce stop-loss and take-profit levels
- **Access Control**: Only owner can configure parameters

## Risk Disclaimer

⚠️ **IMPORTANT**: This trading bot is for educational purposes only. Cryptocurrency trading involves substantial risk and can result in complete loss of capital. Past performance does not guarantee future results. Never invest more than you can afford to lose.

- The algorithm may not perform as expected in live market conditions
- Market conditions can change rapidly, affecting strategy performance
- Technical issues could result in execution failures or losses
- Always test with a small amount first

## Development

### Adding New Strategies

To add a new trading strategy:
1. Implement the strategy logic in `/server/services/tradingAlgorithms.js`
2. Add the strategy to the `getTradingSignal` method
3. Update the frontend to support the new strategy

### Extending DEX Support

To add support for a new DEX:
1. Add DEX configuration in `/server/services/dexAggregator.js`
2. Implement quote function for the new DEX
3. Update the routing logic to consider the new DEX

## Testing

Run the system test:
```bash
node test-bot.js
```

This validates all core components are working correctly.

## Deployment

For production deployment:

1. Set up a MongoDB instance
2. Configure proper API keys for real market data
3. Set up Ethereum RPC provider (Infura, Alchemy, etc.)
4. Deploy smart contracts to the target network
5. Configure SSL for secure connections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.