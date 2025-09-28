// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CryptoTradingBot is Ownable, ReentrancyGuard {
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
        require(tokenToSpend.approve(dex, amount), "Approval failed");

        // Execute trade via DEX
        if (isBuy) {
            amountOut = _executeBuy(dex, amount, minReturn, deadline);
        } else {
            amountOut = _executeSell(dex, amount, minReturn, deadline);
        }

        // Update trading statistics
        totalTrades++;
        lastTradeTime[msg.sender] = block.timestamp;

        // Calculate PnL if possible
        int256 pnl = _calculatePnL(isBuy, amount, amountOut);
        totalPnL += pnl;
        
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
        // This function would interact with the DEX to execute the buy order
        // In a real implementation, you would have specific code for different DEXs
        // This is a simplified placeholder
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
        amountOut = abi.decode(data, (uint256[]))[1]; // Assuming Uniswap-like return
    }

    function _executeSell(
        address dex,
        uint256 amount,
        uint256 minReturn,
        uint256 deadline
    ) internal returns (uint256 amountOut) {
        // This function would interact with the DEX to execute the sell order
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
        amountOut = abi.decode(data, (uint256[]))[1]; // Assuming Uniswap-like return
    }

    function _getRoute(address tokenIn, address tokenOut) internal pure returns (address[] memory) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        return path;
    }

    function _calculatePnL(bool isBuy, uint256 amountIn, uint256 amountOut) internal view returns (int256) {
        // Simplified PnL calculation
        // In a real implementation, you would track entry prices and calculate actual PnL
        uint256 currentPrice = _getCurrentPrice();
        uint256 valueAfter = (amountOut * currentPrice) / 10**18; // Assuming 18 decimals
        uint256 valueBefore = amountIn; // Simplified for demo
        
        if (valueAfter > valueBefore) {
            return int256(valueAfter - valueBefore);
        } else {
            return -int256(valueBefore - valueAfter);
        }
    }

    function _getCurrentPrice() internal view returns (uint256) {
        // This would be implemented with oracle integration in production
        // For now, returning a mock price
        return 10**18; // Mock price
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
        minTradeInterval = interval;
    }

    /**
     * @dev Withdraw tokens (only owner)
     */
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
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
}