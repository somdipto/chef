import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import axios from 'axios';

const DEXAggregator = () => {
  const [tradingPairs, setTradingPairs] = useState([]);
  const [dexes, setDexes] = useState([]);
  const [formData, setFormData] = useState({
    fromToken: 'ETH',
    toToken: 'USDC',
    amount: '',
  });
  const [quotes, setQuotes] = useState([]);
  const [bestQuote, setBestQuote] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch supported trading pairs
    const fetchPairs = async () => {
      try {
        const response = await axios.get('/api/market/pairs');
        setTradingPairs(response.data.data);
      } catch (error) {
        console.error('Error fetching trading pairs:', error);
      }
    };

    // Fetch supported DEXes
    const fetchDEXes = async () => {
      try {
        const response = await axios.get('/api/market/dexes');
        setDexes(response.data.data);
      } catch (error) {
        console.error('Error fetching DEXes:', error);
      }
    };

    fetchPairs();
    fetchDEXes();
  }, []);

  useEffect(() => {
    // Get quotes when amount changes
    if (formData.amount) {
      getQuotes();
    } else {
      setQuotes([]);
      setBestQuote(null);
    }
  }, [formData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getQuotes = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setQuotes([]);
      setBestQuote(null);
      return;
    }

    setLoading(true);
    try {
      // In a real app, this would call the backend to get quotes from multiple DEXes
      // For demo, we'll create mock quotes
      const mockQuotes = dexes.map((dex, index) => {
        const basePrice = parseFloat(formData.amount) * 1750; // Convert ETH to USDC at ~$1750
        const priceAdjustment = 1 - (index * 0.002); // Different prices for each DEX
        const amountOut = basePrice * priceAdjustment;
        const fee = amountOut * dex.fee;
        
        return {
          id: dex.id,
          name: dex.name,
          amountOut: amountOut - fee,
          price: (amountOut - fee) / parseFloat(formData.amount),
          fee: fee,
          slippage: 0.1 + (index * 0.05), // Different slippage for each DEX
          gasEstimate: 150000 - (index * 10000)
        };
      });

      setQuotes(mockQuotes);

      // Find the best quote (highest amount out)
      const best = mockQuotes.reduce((prev, current) => 
        (prev.amountOut > current.amountOut) ? prev : current
      );
      setBestQuote(best);
    } catch (error) {
      console.error('Error getting quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeTrade = async () => {
    if (!bestQuote) {
      alert('No quote available to execute');
      return;
    }

    setLoading(true);
    try {
      // In a real app, this would execute the trade via the best DEX
      const tradeData = {
        dex: bestQuote.id,
        fromToken: formData.fromToken,
        toToken: formData.toToken,
        amount: parseFloat(formData.amount),
        expectedAmount: bestQuote.amountOut,
        slippage: bestQuote.slippage
      };

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert(`Trade executed successfully!\nFrom: ${formData.amount} ${formData.fromToken}\nTo: ${bestQuote.amountOut.toFixed(2)} ${formData.toToken}\nVia: ${bestQuote.name}`);
    } catch (error) {
      console.error('Error executing trade:', error);
      alert('Error executing trade');
    } finally {
      setLoading(false);
    }
  };

  const swapTokens = () => {
    setFormData(prev => ({
      ...prev,
      fromToken: prev.toToken,
      toToken: prev.fromToken
    }));
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        DEX Aggregator
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Swap Tokens
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>From Token</InputLabel>
                <Select
                  value={formData.fromToken}
                  label="From Token"
                  onChange={(e) => handleInputChange('fromToken', e.target.value)}
                >
                  {['ETH', 'BTC', 'USDC', 'DAI', 'SOL', 'MATIC'].map((token) => (
                    <MenuItem key={token} value={token}>
                      {token}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={swapTokens}
                  sx={{ borderRadius: '50%', minWidth: '40px', height: '40px' }}
                >
                  ⇅
                </Button>
              </Box>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>To Token</InputLabel>
                <Select
                  value={formData.toToken}
                  label="To Token"
                  onChange={(e) => handleInputChange('toToken', e.target.value)}
                >
                  {['ETH', 'BTC', 'USDC', 'DAI', 'SOL', 'MATIC'].map((token) => (
                    <MenuItem key={token} value={token}>
                      {token}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                sx={{ mb: 2 }}
              />

              <Button 
                variant="contained" 
                color="primary" 
                fullWidth 
                onClick={executeTrade}
                disabled={loading || !bestQuote}
              >
                {loading ? 'Processing...' : bestQuote ? `Swap via ${bestQuote.name}` : 'Enter Amount'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Best Routes
            </Typography>
            
            {loading ? (
              <Typography variant="body2" color="textSecondary">
                Fetching quotes...
              </Typography>
            ) : quotes.length > 0 ? (
              <Box>
                {quotes.map((quote, index) => (
                  <Card 
                    key={quote.id} 
                    sx={{ 
                      mb: 2, 
                      border: bestQuote && bestQuote.id === quote.id ? '2px solid #1976d2' : '1px solid #e0e0e0'
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="h6">
                            {quote.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Rate: 1 {formData.fromToken} = {quote.price.toFixed(4)} {formData.toToken}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Fee: {quote.fee.toFixed(2)} {formData.toToken}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h6" color="primary">
                            {quote.amountOut.toFixed(4)} {formData.toToken}
                          </Typography>
                          <Chip 
                            label={bestQuote && bestQuote.id === quote.id ? 'BEST' : 'OTHER'} 
                            color={bestQuote && bestQuote.id === quote.id ? 'primary' : 'default'} 
                            size="small" 
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                          Slippage: {quote.slippage.toFixed(2)}%
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Gas: ~{quote.gasEstimate.toLocaleString()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary">
                Enter an amount to see quotes from different DEXes
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Supported DEXes
            </Typography>
            <Grid container spacing={2}>
              {dexes.map((dex) => (
                <Grid item xs={12} sm={6} md={3} key={dex.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">{dex.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Fee: {(dex.fee * 100).toFixed(2)}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        <a href={dex.url} target="_blank" rel="noopener noreferrer">
                          Visit DEX
                        </a>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DEXAggregator;