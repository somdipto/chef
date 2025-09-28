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
  Chip
} from '@mui/material';
import axios from 'axios';

const Positions = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        // In a real app, this would come from the bot service
        // For now, we'll create mock positions
        const mockPositions = [
          {
            id: '1',
            pair: 'ETH/USDC',
            size: 2.5,
            entryPrice: 1750.50,
            currentPrice: 1780.25,
            isLong: true,
            entryTime: new Date(Date.now() - 3600000), // 1 hour ago
            stopLoss: 1662.98,
            takeProfit: 1925.55,
            unrealizedPnL: (1780.25 - 1750.50) * 2.5,
            leverage: 1
          },
          {
            id: '2',
            pair: 'BTC/USDC',
            size: 0.5,
            entryPrice: 27500.75,
            currentPrice: 27350.20,
            isLong: true,
            entryTime: new Date(Date.now() - 7200000), // 2 hours ago
            stopLoss: 26125.71,
            takeProfit: 30250.83,
            unrealizedPnL: (27350.20 - 27500.75) * 0.5,
            leverage: 1
          },
          {
            id: '3',
            pair: 'SOL/USDC',
            size: 50,
            entryPrice: 95.25,
            currentPrice: 97.80,
            isLong: false, // Short position
            entryTime: new Date(Date.now() - 1800000), // 30 minutes ago
            stopLoss: 99.06,
            takeProfit: 85.73,
            unrealizedPnL: (95.25 - 97.80) * 50, // Negative because it's a short
            leverage: 2
          }
        ];
        
        setPositions(mockPositions);
      } catch (error) {
        console.error('Error fetching positions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();

    // Set up periodic updates
    const interval = setInterval(fetchPositions, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleClosePosition = async (positionId) => {
    try {
      await axios.delete(`/api/trades/positions/${positionId}`);
      // Remove position from state
      setPositions(positions.filter(pos => pos.id !== positionId));
      alert('Position closed successfully!');
    } catch (error) {
      console.error('Error closing position:', error);
      alert('Error closing position');
    }
  };

  const calculatePnLPercentage = (entryPrice, currentPrice, isLong) => {
    const change = isLong 
      ? (currentPrice - entryPrice) / entryPrice 
      : (entryPrice - currentPrice) / entryPrice;
    return (change * 100).toFixed(2);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Active Positions
      </Typography>

      <Paper elevation={3} sx={{ p: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Pair</TableCell>
                <TableCell align="center">Type</TableCell>
                <TableCell align="right">Size</TableCell>
                <TableCell align="right">Entry Price</TableCell>
                <TableCell align="right">Current Price</TableCell>
                <TableCell align="right">P&L</TableCell>
                <TableCell align="right">P&L %</TableCell>
                <TableCell align="right">Stop Loss</TableCell>
                <TableCell align="right">Take Profit</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell component="th" scope="row">
                    {position.pair}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={position.isLong ? 'LONG' : 'SHORT'}
                      color={position.isLong ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{position.size}</TableCell>
                  <TableCell align="right">${position.entryPrice.toFixed(2)}</TableCell>
                  <TableCell align="right">${position.currentPrice.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ 
                    color: position.unrealizedPnL >= 0 ? 'success.main' : 'error.main',
                    fontWeight: 'bold'
                  }}>
                    ${position.unrealizedPnL.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ 
                    color: parseFloat(calculatePnLPercentage(position.entryPrice, position.currentPrice, position.isLong)) >= 0 ? 'success.main' : 'error.main',
                    fontWeight: 'bold'
                  }}>
                    {calculatePnLPercentage(position.entryPrice, position.currentPrice, position.isLong)}%
                  </TableCell>
                  <TableCell align="right">${position.stopLoss.toFixed(2)}</TableCell>
                  <TableCell align="right">${position.takeProfit.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Button 
                      variant="outlined" 
                      color="error" 
                      size="small"
                      onClick={() => handleClosePosition(position.id)}
                    >
                      Close
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {positions.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">
              No active positions
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Your trading positions will appear here when the bot opens them
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Positions Summary */}
      {positions.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Positions Summary
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Total Positions
              </Typography>
              <Typography variant="h5">
                {positions.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Total Value
              </Typography>
              <Typography variant="h5">
                ${positions.reduce((sum, pos) => sum + (pos.size * pos.currentPrice), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Unrealized P&L
              </Typography>
              <Typography 
                variant="h5"
                color={positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0) >= 0 ? 'success.main' : 'error.main'}
              >
                ${positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0).toFixed(2)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Winning Positions
              </Typography>
              <Typography variant="h5">
                {positions.filter(pos => pos.unrealizedPnL >= 0).length}/{positions.length}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default Positions;