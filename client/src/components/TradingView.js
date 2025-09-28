import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import axios from 'axios';

const TradingView = () => {
  const [selectedPair, setSelectedPair] = useState('ETH/USDC');
  const [chartData, setChartData] = useState([]);
  const [indicators, setIndicators] = useState({});
  const [tradingPairs, setTradingPairs] = useState([]);

  useEffect(() => {
    // Fetch available trading pairs
    const fetchTradingPairs = async () => {
      try {
        const response = await axios.get('/api/market/pairs');
        setTradingPairs(response.data.data);
        
        // Set first pair as default if none selected
        if (response.data.data.length > 0 && !selectedPair) {
          setSelectedPair(response.data.data[0]);
        }
      } catch (error) {
        console.error('Error fetching trading pairs:', error);
      }
    };

    fetchTradingPairs();
  }, []);

  useEffect(() => {
    // Fetch OHLCV data for selected pair
    const fetchChartData = async () => {
      try {
        if (selectedPair) {
          const response = await axios.get(`/api/market/ohlcv/${selectedPair.replace('/', '-')}`);
          // Format the data for the chart
          const formattedData = response.data.data.map(item => ({
            time: new Date(item.time).toLocaleTimeString(),
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume
          }));
          setChartData(formattedData);
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      }
    };

    fetchChartData();

    // Set up periodic updates
    const interval = setInterval(fetchChartData, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [selectedPair]);

  const handlePairChange = (event) => {
    setSelectedPair(event.target.value);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Trading Terminal
      </Typography>

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Trading Pair</InputLabel>
              <Select
                value={selectedPair}
                label="Trading Pair"
                onChange={handlePairChange}
              >
                {tradingPairs.map((pair) => (
                  <MenuItem key={pair} value={pair}>
                    {pair}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        </Grid>

        {/* Price Chart */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {selectedPair} Price Chart
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="close" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.3}
                  name="Price" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Market Stats */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Market Data
            </Typography>
            {chartData.length > 0 && (
              <>
                <Typography variant="h4" color="primary" gutterBottom>
                  ${chartData[chartData.length - 1]?.close?.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  24h Change: 
                  <span style={{ color: Math.random() > 0.5 ? '#4caf50' : '#f44336' }}>
                    {Math.random() > 0.5 ? ' +2.34%' : ' -1.23%'}
                  </span>
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  24h Volume: ${(Math.random() * 10000000).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}
                </Typography>
              </>
            )}
          </Paper>

          {/* Indicators */}
          <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Technical Indicators
            </Typography>
            <Typography variant="body2">
              RSI: <strong>{(Math.random() * 100).toFixed(2)}</strong> 
              <span style={{ color: Math.random() > 0.5 ? '#4caf50' : '#f44336', marginLeft: 8 }}>
                {Math.random() > 0.7 ? 'OVERBOUGHT' : Math.random() < 0.3 ? 'OVERSOLD' : 'NEUTRAL'}
              </span>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              MACD: <strong>{(Math.random() * 2 - 1).toFixed(4)}</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Moving Average: <strong>${(Math.random() * 1000 + 1000).toFixed(2)}</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Bollinger Bands: 
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Upper: ${(Math.random() * 1000 + 1200).toFixed(2)}</span>
                <span>Lower: ${(Math.random() * 1000 + 800).toFixed(2)}</span>
              </div>
            </Typography>
          </Paper>
        </Grid>

        {/* Recent Trades */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Trades
            </Typography>
            <Box sx={{ height: 300, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Pair</th>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Amount</th>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Price</th>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 10 }).map((_, index) => (
                    <tr key={index}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        {new Date(Date.now() - index * 60000).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{selectedPair}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        <span style={{ 
                          color: index % 3 === 0 ? '#4caf50' : '#f44336', 
                          fontWeight: 'bold' 
                        }}>
                          {index % 3 === 0 ? 'BUY' : 'SELL'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        {(Math.random() * 5).toFixed(4)}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        ${(Math.random() * 1000 + 1000).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        <span style={{ 
                          color: index % 2 === 0 ? '#4caf50' : '#ff9800', 
                          fontWeight: 'bold' 
                        }}>
                          {index % 2 === 0 ? 'FILLED' : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Paper>
        </Grid>

        {/* Trading Panel */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Place Trade
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="textSecondary">Order Type</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <button 
                    style={{ 
                      flex: 1, 
                      padding: '8px', 
                      border: '1px solid #8884d8', 
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px'
                    }}
                  >
                    Limit
                  </button>
                  <button 
                    style={{ 
                      flex: 1, 
                      padding: '8px', 
                      border: '1px solid #8884d8', 
                      backgroundColor: '#8884d8',
                      color: 'white',
                      borderRadius: '4px'
                    }}
                  >
                    Market
                  </button>
                </Box>
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary">Order Side</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <button 
                    style={{ 
                      flex: 1, 
                      padding: '8px', 
                      border: '1px solid #4caf50', 
                      backgroundColor: '#4caf50',
                      color: 'white',
                      borderRadius: '4px'
                    }}
                  >
                    BUY
                  </button>
                  <button 
                    style={{ 
                      flex: 1, 
                      padding: '8px', 
                      border: '1px solid #f44336', 
                      backgroundColor: '#f44336',
                      color: 'white',
                      borderRadius: '4px'
                    }}
                  >
                    SELL
                  </button>
                </Box>
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary">Amount</Typography>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}
                />
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary">Price</Typography>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    border: '1px solid #ccc', 
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}
                />
              </Box>

              <button 
                style={{ 
                  padding: '12px', 
                  backgroundColor: '#8884d8', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                BUY {selectedPair.split('/')[0]}
              </button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TradingView;