import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Slider, 
  Switch, 
  FormControlLabel 
} from '@mui/material';
import axios from 'axios';

const BotConfiguration = () => {
  const [config, setConfig] = useState({
    strategy: 'combined',
    riskLevel: 'medium',
    maxPositionSize: 0.1,
    stopLoss: 0.05,
    takeProfit: 0.1,
    tradingPairs: ['ETH/USDC', 'BTC/USDC'],
    tradingFrequency: 'high',
    slippage: 0.5
  });

  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch current bot configuration
    const fetchConfig = async () => {
      try {
        const response = await axios.get('/api/bot');
        setConfig(response.data.data.configuration);
      } catch (error) {
        console.error('Error fetching bot config:', error);
      }
    };

    // Fetch available strategies
    const fetchStrategies = async () => {
      try {
        const response = await axios.get('/api/bot/strategies');
        setStrategies(response.data.data);
      } catch (error) {
        console.error('Error fetching strategies:', error);
      }
    };

    fetchConfig();
    fetchStrategies();
  }, []);

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put('/api/bot', config);
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error saving configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setConfig({
      strategy: 'combined',
      riskLevel: 'medium',
      maxPositionSize: 0.1,
      stopLoss: 0.05,
      takeProfit: 0.1,
      tradingPairs: ['ETH/USDC', 'BTC/USDC'],
      tradingFrequency: 'high',
      slippage: 0.5
    });
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Bot Configuration
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Trading Settings
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Trading Strategy</InputLabel>
                  <Select
                    value={config.strategy}
                    label="Trading Strategy"
                    onChange={(e) => handleInputChange('strategy', e.target.value)}
                  >
                    {strategies.map((strategy) => (
                      <MenuItem key={strategy.id} value={strategy.id}>
                        {strategy.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                    {strategies.find(s => s.id === config.strategy)?.description}
                  </Typography>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Risk Level</InputLabel>
                  <Select
                    value={config.riskLevel}
                    label="Risk Level"
                    onChange={(e) => handleInputChange('riskLevel', e.target.value)}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Trading Frequency</InputLabel>
                  <Select
                    value={config.tradingFrequency}
                    label="Trading Frequency"
                    onChange={(e) => handleInputChange('tradingFrequency', e.target.value)}
                  >
                    <MenuItem value="low">Low (Every 30 min)</MenuItem>
                    <MenuItem value="medium">Medium (Every 10 min)</MenuItem>
                    <MenuItem value="high">High (Every 5 min)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Slippage Tolerance (%)</InputLabel>
                  <Select
                    value={config.slippage}
                    label="Slippage Tolerance (%)"
                    onChange={(e) => handleInputChange('slippage', e.target.value)}
                  >
                    <MenuItem value={0.1}>0.1%</MenuItem>
                    <MenuItem value={0.3}>0.3%</MenuItem>
                    <MenuItem value={0.5}>0.5%</MenuItem>
                    <MenuItem value={1.0}>1.0%</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Max Position Size: {(config.maxPositionSize * 100).toFixed(2)}%
                </Typography>
                <Slider
                  value={config.maxPositionSize * 100}
                  min={0.1}
                  max={50}
                  step={0.1}
                  valueLabelDisplay="auto"
                  onChange={(e, value) => handleInputChange('maxPositionSize', value / 100)}
                />
                <Typography variant="caption" color="textSecondary">
                  Maximum percentage of portfolio to risk per trade
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Stop Loss: {(config.stopLoss * 100).toFixed(2)}%
                </Typography>
                <Slider
                  value={config.stopLoss * 100}
                  min={0.5}
                  max={20}
                  step={0.1}
                  valueLabelDisplay="auto"
                  onChange={(e, value) => handleInputChange('stopLoss', value / 100)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Take Profit: {(config.takeProfit * 100).toFixed(2)}%
                </Typography>
                <Slider
                  value={config.takeProfit * 100}
                  min={1}
                  max={50}
                  step={0.1}
                  valueLabelDisplay="auto"
                  onChange={(e, value) => handleInputChange('takeProfit', value / 100)}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Trading Pairs
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {config.tradingPairs.map((pair, index) => (
                <Box
                  key={index}
                  sx={{
                    backgroundColor: '#8884d8',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '0.8rem'
                  }}
                >
                  {pair}
                </Box>
              ))}
            </Box>
            <Button 
              variant="outlined" 
              color="primary"
              fullWidth
              onClick={() => {
                // Add new pair logic here
                const newPair = prompt('Enter trading pair (e.g., ETH/USDC):');
                if (newPair) {
                  setConfig(prev => ({
                    ...prev,
                    tradingPairs: [...prev.tradingPairs, newPair]
                  }));
                }
              }}
            >
              Add Trading Pair
            </Button>
          </Paper>

          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Risk Management
            </Typography>
            <FormControlLabel
              control={<Switch checked={true} />}
              label="Enable Risk Management"
              disabled
            />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Risk management is always enabled to protect your capital.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Configuration Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Current Strategy:
                </Typography>
                <Typography variant="body1">
                  {strategies.find(s => s.id === config.strategy)?.name || config.strategy}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Risk Level:
                </Typography>
                <Typography variant="body1" textTransform="capitalize">
                  {config.riskLevel}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Trading Frequency:
                </Typography>
                <Typography variant="body1" textTransform="capitalize">
                  {config.tradingFrequency}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={handleReset}
            >
              Reset to Default
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BotConfiguration;