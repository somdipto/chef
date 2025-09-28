const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const tradeRoutes = require('./routes/tradeRoutes');
const botRoutes = require('./routes/botRoutes');
const marketDataRoutes = require('./routes/marketDataRoutes');
const walletRoutes = require('./routes/walletRoutes');
const { securityHeaders } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers middleware
app.use(securityHeaders);

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-trading-bot', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/trades', tradeRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/market', marketDataRoutes);
app.use('/api/wallet', walletRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});