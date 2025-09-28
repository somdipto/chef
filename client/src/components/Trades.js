import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import axios from 'axios';
import moment from 'moment';

const Trades = () => {
  const [trades, setTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        // In a real app, this would come from the backend
        // For now, we'll create mock trades
        const mockTrades = [
          {
            id: '1',
            pair: 'ETH/USDC',
            signal: 'BUY',
            size: 1.2,
            price: 1748.50,
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            realizedPnL: 0,
            status: 'executed',
            transactionHash: '0xabc123...'
          },
          {
            id: '2',
            pair: 'BTC/USDC',
            signal: 'SELL',
            size: 0.3,
            price: 27510.25,
            timestamp: new Date(Date.now() - 7200000), // 2 hours ago
            realizedPnL: 150.75,
            status: 'executed',
            transactionHash: '0xdef456...'
          },
          {
            id: '3',
            pair: 'SOL/USDC',
            signal: 'BUY',
            size: 25,
            price: 94.80,
            timestamp: new Date(Date.now() - 10800000), // 3 hours ago
            realizedPnL: -25.50,
            status: 'executed',
            transactionHash: '0xghi789...'
          },
          {
            id: '4',
            pair: 'ETH/USDC',
            signal: 'SELL',
            size: 1.0,
            price: 1755.30,
            timestamp: new Date(Date.now() - 14400000), // 4 hours ago
            realizedPnL: 6.80,
            status: 'executed',
            transactionHash: '0xjkl012...'
          },
          {
            id: '5',
            pair: 'MATIC/USDC',
            signal: 'BUY',
            size: 500,
            price: 0.745,
            timestamp: new Date(Date.now() - 18000000), // 5 hours ago
            realizedPnL: 12.75,
            status: 'executed',
            transactionHash: '0xmnt345...'
          }
        ];
        
        setTrades(mockTrades);
        setFilteredTrades(mockTrades);
      } catch (error) {
        console.error('Error fetching trades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, []);

  useEffect(() => {
    // Apply filter
    let result = trades;
    
    if (filter !== 'all') {
      if (filter === 'buy') {
        result = trades.filter(trade => trade.signal === 'BUY');
      } else if (filter === 'sell') {
        result = trades.filter(trade => trade.signal === 'SELL');
      } else if (filter === 'profit') {
        result = trades.filter(trade => trade.realizedPnL > 0);
      } else if (filter === 'loss') {
        result = trades.filter(trade => trade.realizedPnL < 0);
      }
    }
    
    setFilteredTrades(result);
  }, [filter, trades]);

  const getProfitColor = (pnl) => {
    if (pnl > 0) return 'success.main';
    if (pnl < 0) return 'error.main';
    return 'text.primary';
  };

  const getSignalColor = (signal) => {
    return signal === 'BUY' ? 'success.main' : 'error.main';
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Trade History
      </Typography>

      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Trade History ({filteredTrades.length} trades)
          </Typography>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Filter</InputLabel>
            <Select
              value={filter}
              label="Filter"
              onChange={(e) => setFilter(e.target.value)}
            >
              <MenuItem value="all">All Trades</MenuItem>
              <MenuItem value="buy">Buy Trades</MenuItem>
              <MenuItem value="sell">Sell Trades</MenuItem>
              <MenuItem value="profit">Profit Trades</MenuItem>
              <MenuItem value="loss">Loss Trades</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Pair</TableCell>
                <TableCell align="center">Signal</TableCell>
                <TableCell align="right">Size</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">P&L</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Transaction</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTrades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell component="th" scope="row">
                    {moment(trade.timestamp).format('HH:mm:ss')}
                  </TableCell>
                  <TableCell>{trade.pair}</TableCell>
                  <TableCell align="center">
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 'bold', 
                        color: getSignalColor(trade.signal) 
                      }}
                    >
                      {trade.signal}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{trade.size}</TableCell>
                  <TableCell align="right">${trade.price.toFixed(2)}</TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      fontWeight: 'bold', 
                      color: getProfitColor(trade.realizedPnL) 
                    }}
                  >
                    ${trade.realizedPnL.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        textTransform: 'capitalize',
                        color: trade.status === 'executed' ? 'success.main' : 'warning.main'
                      }}
                    >
                      {trade.status}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="textSecondary">
                      {trade.transactionHash.substring(0, 6)}...
                      {trade.transactionHash.substring(trade.transactionHash.length - 4)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredTrades.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">
              No trades found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Your trade history will appear here after executing trades
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Trades Summary */}
      {trades.length > 0 && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Trading Statistics
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Total Trades
              </Typography>
              <Typography variant="h5">
                {trades.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Total Profit/Loss
              </Typography>
              <Typography 
                variant="h5"
                color={trades.reduce((sum, trade) => sum + trade.realizedPnL, 0) >= 0 ? 'success.main' : 'error.main'}
              >
                ${trades.reduce((sum, trade) => sum + trade.realizedPnL, 0).toFixed(2)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Win Rate
              </Typography>
              <Typography variant="h5">
                {trades.length > 0 
                  ? `${Math.round((trades.filter(t => t.realizedPnL > 0).length / trades.length) * 100)}%` 
                  : '0%'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Best Trade
              </Typography>
              <Typography variant="h5" color="success.main">
                ${Math.max(...trades.map(t => t.realizedPnL), 0).toFixed(2)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Worst Trade
              </Typography>
              <Typography variant="h5" color="error.main">
                ${Math.min(...trades.map(t => t.realizedPnL), 0).toFixed(2)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Average P&L
              </Typography>
              <Typography variant="h5">
                ${(trades.reduce((sum, trade) => sum + trade.realizedPnL, 0) / trades.length).toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default Trades;