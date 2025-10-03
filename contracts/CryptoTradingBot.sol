// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract CryptoTradingBot is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // Trading strategy parameters
    struct Strategy {
        uint256 minBalance; // Minimum balance required to execute trades
        uint8 buyThreshold; // Threshold for buy signals (0-100)
        uint8 sellThreshold; // Threshold for sell signals (0-100)
        uint256 maxTradeAmount; // Maximum amount to trade
        uint256 stopLoss; // Stop loss percentage (e.g., 5% = 500, precision: 2 decimals)
        uint256 takeProfit; // Take profit percentage (e.g., 10% = 1000, precision: 2 decimals)
    }

    Strategy public strategy;
    
    // Trading pair information
    IERC20 public baseToken; // Base token (e.g., USDC, DAI)
    IERC20 public quoteToken; // Quote token (e.g., ETH, BTC)

    // Trading statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public failedTrades;
    uint256 public totalPnL; // Total profit and loss

    // Trading state
    mapping(address => bool) public authorizedDexs;
    mapping(address => uint256) public lastTradeTime;
    uint256 public minTradeInterval = 1 minutes; // Minimum time between trades

    // Position tracking for more accurate PnL calculation
    struct Position {
        uint256 baseAmount;    // Amount of base token used to buy quote token
        uint256 quoteAmount;   // Amount of quote token bought
        uint256 entryPrice;    // Price at which position was opened
        uint256 timestamp;     // Time when position was opened
    }
    
    Position[] public positions;
    mapping(uint256 => address) public positionTraders; // Maps position index to trader

    // Events
    event TradeExecuted(
        uint256 indexed tradeId,
        address indexed trader,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 price,
        bool isBuy,
        int256 pnl
    );

    event PositionOpened(
        uint256 indexed positionId,
        address indexed trader,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 entryPrice
    );

    event PositionClosed(
        uint256 indexed positionId,
        address indexed trader,
        uint256 quoteAmount,
        uint256 baseAmount,
        uint256 exitPrice,
        int256 pnl
    );

    event StrategyUpdated(Strategy newStrategy);
    event DEXAuthorized(address indexed dex, bool authorized);

    constructor(
        IERC20 _baseToken,
        IERC20 _quoteToken,
        Strategy memory _strategy
    ) {
        baseToken = _baseToken;
        quoteToken = _quoteToken;
        strategy = _strategy;
    }

    /**
     * @dev Execute a trade based on the strategy
     * @param dex The decentralized exchange to use
     * @param isBuy True for buy, false for sell
     * @param amount Amount of tokens to trade
     * @param minReturn Minimum return expected (for slippage protection)
     * @param deadline Deadline for the trade
     */
    function executeTrade(
        address dex,
        bool isBuy,
        uint256 amount,
        uint256 minReturn,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(authorizedDexs[dex], "DEX not authorized");
        require(amount <= strategy.maxTradeAmount, "Amount exceeds max trade limit");
        require(block.timestamp >= lastTradeTime[msg.sender] + minTradeInterval, "Trade too soon");
        require(block.timestamp <= deadline, "Trade expired");

        // Validate trading strategy thresholds
        uint8 signalThreshold = isBuy ? strategy.buyThreshold : strategy.sellThreshold;
        require(signalThreshold > 0, "Invalid trading signal");

        // Check balance requirements
        IERC20 tokenToSpend = isBuy ? baseToken : quoteToken;
        IERC20 tokenToReceive = isBuy ? quoteToken : baseToken;
        
        uint256 balance = tokenToSpend.balanceOf(address(this));
        require(balance >= strategy.minBalance, "Insufficient minimum balance");
        require(balance >= amount, "Insufficient balance for trade");

        // Approve DEX for token spending
        tokenToSpend.safeApprove(dex, 0); // Reset to 0 first to avoid issues with some tokens
        tokenToSpend.safeApprove(dex, amount);

        // Execute trade via DEX
        if (isBuy) {
            amountOut = _executeBuy(dex, amount, minReturn, deadline);
            
            // Record the position for PnL calculation
            uint256 currentPrice = _getCurrentPrice();
            Position memory newPosition = Position({
                baseAmount: amount,
                quoteAmount: amountOut,
                entryPrice: currentPrice,
                timestamp: block.timestamp
            });
            
            positions.push(newPosition);
            uint256 positionId = positions.length - 1;
            positionTraders[positionId] = msg.sender;
            
            emit PositionOpened(positionId, msg.sender, amount, amountOut, currentPrice);
        } else {
            amountOut = _executeSell(dex, amount, minReturn, deadline);
        }

        // Update trading statistics
        totalTrades++;
        lastTradeTime[msg.sender] = block.timestamp;

        // Calculate PnL if possible
        int256 pnl = isBuy ? int256(0) : _calculatePnLForSell(amount, amountOut); // Only calculate PnL for sells
        totalPnL = pnl >= 0 ? totalPnL.add(uint256(pnl)) : totalPnL.sub(uint256(-pnl));
        
        if (pnl >= 0) {
            successfulTrades++;
        } else {
            failedTrades++;
        }

        emit TradeExecuted(totalTrades, msg.sender, amount, amountOut, _getCurrentPrice(), isBuy, pnl);
    }

    function _executeBuy(
        address dex,
        uint256 amount,
        uint256 minReturn,
        uint256 deadline
    ) internal returns (uint256 amountOut) {
        // Get the initial quote token balance to measure the output
        uint256 initialQuoteBalance = quoteToken.balanceOf(address(this));
        
        // Call the DEX to execute the swap
        (bool success, bytes memory data) = dex.call(
            abi.encodeWithSignature(
                "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
                amount,
                minReturn,
                _getRoute(address(baseToken), address(quoteToken)),
                address(this),
                deadline
            )
        );
        
        require(success, "Buy execution failed");
        
        // Calculate the actual amount received
        uint256 finalQuoteBalance = quoteToken.balanceOf(address(this));
        amountOut = finalQuoteBalance.sub(initialQuoteBalance);
    }

    function _executeSell(
        address dex,
        uint256 amount,
        uint256 minReturn,
        uint256 deadline
    ) internal returns (uint256 amountOut) {
        // Get the initial base token balance to measure the output
        uint256 initialBaseBalance = baseToken.balanceOf(address(this));
        
        // Call the DEX to execute the swap
        (bool success, bytes memory data) = dex.call(
            abi.encodeWithSignature(
                "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
                amount,
                minReturn,
                _getRoute(address(quoteToken), address(baseToken)),
                address(this),
                deadline
            )
        );
        
        require(success, "Sell execution failed");
        
        // Calculate the actual amount received
        uint256 finalBaseBalance = baseToken.balanceOf(address(this));
        amountOut = finalBaseBalance.sub(initialBaseBalance);
    }

    function _getRoute(address tokenIn, address tokenOut) internal pure returns (address[] memory) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        return path;
    }

    function _calculatePnLForSell(uint256 quoteAmountSold, uint256 baseAmountReceived) internal view returns (int256) {
        // In a real implementation with oracle integration, this would use real prices
        // For now, we'll implement a basic PnL calculation based on current price
        uint256 currentPrice = _getCurrentPrice();
        
        // Calculate the current value of the tokens sold
        uint256 valueBefore = (quoteAmountSold * currentPrice) / 10**18; // Assuming 18 decimals
        uint256 valueAfter = baseAmountReceived;
        
        if (valueAfter > valueBefore) {
            return int256(valueAfter - valueBefore);
        } else {
            return -int256(valueBefore - valueAfter);
        }
    }

    /**
     * @dev This would be implemented with oracle integration in production
     * For now, returning a mock price - this should be replaced with a real oracle
     */
    function _getCurrentPrice() internal view returns (uint256) {
        // In production, this would fetch from Chainlink or other oracle
        // For now, return a placeholder price
        // This is a critical improvement needed for production
        return 10**18; // Placeholder - needs real oracle
    }

    /**
     * @dev Update the trading strategy
     */
    function updateStrategy(Strategy memory _strategy) external onlyOwner {
        strategy = _strategy;
        emit StrategyUpdated(_strategy);
    }

    /**
     * @dev Authorize a DEX for trading
     */
    function setAuthorizedDex(address dex, bool authorized) external onlyOwner {
        authorizedDexs[dex] = authorized;
        emit DEXAuthorized(dex, authorized);
    }

    /**
     * @dev Set minimum trade interval
     */
    function setMinTradeInterval(uint256 interval) external onlyOwner {
        require(interval >= 30 seconds, "Minimum trade interval too low");
        minTradeInterval = interval;
    }

    /**
     * @dev Withdraw tokens (only owner)
     */
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    /**
     * @dev Get trading statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _failedTrades,
        uint256 _totalPnL
    ) {
        return (totalTrades, successfulTrades, failedTrades, totalPnL);
    }

    /**
     * @dev Get current position count
     */
    function getPositionCount() external view returns (uint256) {
        return positions.length;
    }

    /**
     * @dev Get position details by index
     */
    function getPosition(uint256 index) external view returns (
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 entryPrice,
        uint256 timestamp
    ) {
        require(index < positions.length, "Position index out of bounds");
        
        Position memory pos = positions[index];
        return (pos.baseAmount, pos.quoteAmount, pos.entryPrice, pos.timestamp);
    }
}