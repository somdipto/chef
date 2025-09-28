import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Button, Chip } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const Dashboard = () => {
  const [botStatus, setBotStatus] = useState(null);
  const [marketData, setMarketData] = useState({});
  const [performanceData, setPerformanceData] = useState([]);

  useEffect(() => {
    // Fetch bot status
    const fetchBotStatus = async () => {
      try {
        const response = await axios.get('/api/bot');
        setBotStatus(response.data.data);
      } catch (error) {
        console.error('Error fetching bot status:', error);
      }
    };

    // Fetch market data
    const fetchMarketData = async () => {
      try {
        const response = await axios.get('/api/market/prices');
        setMarketData(response.data.data);
      } catch (error) {
        console.error('Error fetching market data:', error);
      }
    };

    // Generate mock performance data
    const generatePerformanceData = () => {
      const data = [];
      let value = 10000; // Starting value
      for (let i = 0; i < 30; i++) {
        value = value * (1 + (Math.random() - 0.5) * 0.02); // Random movement ±1%
        data.push({
          date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          value: Math.round(value)
        });
      }
      setPerformanceData(data);
    };

    fetchBotStatus();
    fetchMarketData();
    generatePerformanceData();

    // Set up periodic updates
    const interval = setInterval(() => {
      fetchBotStatus();
      fetchMarketData();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const toggleBotStatus = async () => {
    try {
      const endpoint = botStatus?.isRunning ? '/api/bot/stop' : '/api/bot/start';
      const response = await axios.post(endpoint);
      setBotStatus(response.data.data);
    } catch (error) {
      console.error('Error toggling bot status:', error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Crypto Trading Bot Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Bot Status Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Bot Status
            </Typography>
            {botStatus ? (
              <>
                <Chip
                  label={botStatus.isRunning ? 'RUNNING' : 'STOPPED'}
                  color={botStatus.isRunning ? 'success' : 'default'}
                  variant="outlined"
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  Strategy: {botStatus.configuration.strategy}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Risk Level: {botStatus.configuration.riskLevel}
                </Typography>
                <Button
                  variant="contained"
                  color={botStatus.isRunning ? 'error' : 'success'}
                  onClick={toggleBotStatus}
                  sx={{ mt: 1 }}
                >
                  {botStatus.isRunning ? 'Stop Bot' : 'Start Bot'}
                </Button>
              </>
            ) : (
              <Typography variant="body2">Loading...</Typography>
            )}
          </Paper>
        </Grid>

        {/* Portfolio Value Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Portfolio Value
            </Typography>
            <Typography variant="h4" color="primary">
              {botStatus ? `$${botStatus.account.balance.toLocaleString()}` : '$0.00'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              +2.5% (24h)
            </Typography>
          </Paper>
        </Grid>

        {/* Positions Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Active Positions
            </Typography>
            <Typography variant="h4" color="primary">
              {botStatus ? botStatus.account.positions : 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              2 long, 1 short
            </Typography>
          </Paper>
        </Grid>

        {/* Total Trades Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Total Trades
            </Typography>
            <Typography variant="h4" color="primary">
              {botStatus ? botStatus.account.trades : 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Success Rate: 65%
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Performance Chart */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Portfolio Performance (30 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Market Overview */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Market Overview
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(marketData).slice(0, 6).map(([pair, price]) => (
                <Grid item xs={12} sm={6} md={2} key={pair}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      {pair}
                    </Typography>
                    <Typography variant="h6">
                      ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color={Math.random() > 0.5 ? "success.main" : "error.main"}
                    >
                      {Math.random() > 0.5 ? '↗' : '↘'} {(Math.random() * 5 - 2).toFixed(2)}%
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;