// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title CryptoToken
 * @dev Mock token to represent crypto assets in the exchange
 */
contract CryptoToken is ERC20, Ownable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _transferOwnership(msg.sender);
        // Mint initial supply: 100 million tokens (with proper decimals)
        _mint(msg.sender, 100_000_000 * 10**decimals());
    }

    function decimals() public view virtual override returns (uint8) {
        return 18; // Standard for most cryptocurrencies
    }
}

/**
 * @title CryptoExchange
 * @dev A decentralized exchange for trading cryptocurrencies with real-time price feeds
 */
contract CryptoExchange is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // Crypto asset information
    struct Asset {
        string name;
        uint256 price; // Price in USD * 10^8 (for 8 decimal precision)
        uint256 totalSupply;
        uint256 marketCap;
        bool isActive;
    }

    // User portfolio tracking
    struct Portfolio {
        mapping(address => uint256) assets; // Asset address -> quantity
        uint256 ethBalance; // User's ETH balance in the contract
    }

    // Mapping of asset addresses to asset information
    mapping(address => Asset) public assets;
    
    // Mapping of user addresses to their portfolios
    mapping(address => Portfolio) public portfolios;
    
    // Token used for internal exchange operations
    CryptoToken public exchangeToken;
    
    // Mapping to track which assets are supported
    address[] public supportedAssets;
    
    // Minimum values for trading
    uint256 public constant MIN_TRADE_AMOUNT = 10**6; // Minimum trade amount in token units
    uint256 public constant FEE_PERCENTAGE = 1; // 0.1% fee (in basis points * 10)
    uint256 public maxPriceChange = 1000; // Max price change allowed: 10% (with 2 decimals)

    // Events for tracking important operations
    event AssetAdded(address indexed assetAddress, string name, uint256 initialPrice);
    event AssetPriceUpdated(address indexed assetAddress, uint256 newPrice);
    event TokensBought(address indexed buyer, address indexed asset, uint256 quantity, uint256 ethSpent);
    event TokensSold(address indexed seller, address indexed asset, uint256 quantity, uint256 ethReceived);
    event EthDeposited(address indexed user, uint256 amount);
    event EthWithdrawn(address indexed user, uint256 amount);
    event MaxPriceChangeUpdated(uint256 newMaxPriceChange);
    event AssetVerified(address indexed assetAddress, string name);

    /**
     * @dev Initializes the contract with an exchange token
     */
    constructor(address _exchangeTokenAddress) {
        _transferOwnership(msg.sender);
        exchangeToken = CryptoToken(_exchangeTokenAddress);
    }

    /**
     * @dev Adds a new crypto asset to the exchange
     * @param assetAddress The address of the crypto asset token
     * @param name The name of the asset
     * @param initialPrice The initial price in USD * 10^8
     */
    function addAsset(address assetAddress, string memory name, uint256 initialPrice) external onlyOwner {
        require(assetAddress != address(0), "Invalid asset address");
        require(assetAddress != address(exchangeToken), "Cannot add exchange token as asset");
        require(!assets[assetAddress].isActive, "Asset already exists");
        require(initialPrice > 0, "Price must be greater than 0");
        
        assets[assetAddress] = Asset({
            name: name,
            price: initialPrice,
            totalSupply: 0,
            marketCap: initialPrice * 1000000, // Assuming 1M initial shares
            isActive: true
        });
        
        supportedAssets.push(assetAddress);
        
        emit AssetAdded(assetAddress, name, initialPrice);
    }

    /**
     * @dev Updates the price of a crypto asset with safety checks
     * @param assetAddress The address of the crypto asset
     * @param newPrice The new price in USD * 10^8
     */
    function updateAssetPrice(address assetAddress, uint256 newPrice) external onlyOwner {
        require(assets[assetAddress].isActive, "Asset does not exist or inactive");
        require(newPrice > 0, "Price must be greater than 0");
        
        uint256 oldPrice = assets[assetAddress].price;
        uint256 priceChangePercent = (oldPrice > newPrice) 
            ? (oldPrice - newPrice) * 10000 / oldPrice  // Avoid underflow
            : (newPrice - oldPrice) * 10000 / oldPrice;
        
        require(priceChangePercent <= maxPriceChange, "Price change too large");
        
        assets[assetAddress].price = newPrice;
        emit AssetPriceUpdated(assetAddress, newPrice);
    }

    /**
     * @dev Sets the maximum allowed price change percentage
     * @param newMaxPriceChange The new maximum price change (with 2 decimals, e.g. 1000 = 10%)
     */
    function setMaxPriceChange(uint256 newMaxPriceChange) external onlyOwner {
        require(newMaxPriceChange <= 5000, "Max price change too high (max 50%)");
        maxPriceChange = newMaxPriceChange;
        emit MaxPriceChangeUpdated(newMaxPriceChange);
    }

    /**
     * @dev Deposits ETH into the user's portfolio
     */
    function depositEth() external payable nonReentrant {
        require(msg.value > 0, "Must send ETH to deposit");
        portfolios[msg.sender].ethBalance = portfolios[msg.sender].ethBalance.add(msg.value);
        emit EthDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Withdraws ETH from the user's portfolio
     * @param amount The amount of ETH to withdraw
     */
    function withdrawEth(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(portfolios[msg.sender].ethBalance >= amount, "Insufficient ETH balance");
        
        portfolios[msg.sender].ethBalance = portfolios[msg.sender].ethBalance.sub(amount);
        payable(msg.sender).transfer(amount);
        emit EthWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Buys crypto tokens with ETH
     * @param assetAddress The address of the asset to buy
     * @param quantity The quantity to buy
     */
    function buyTokens(address assetAddress, uint256 quantity) external payable nonReentrant {
        require(assets[assetAddress].isActive, "Asset does not exist or inactive");
        require(quantity >= MIN_TRADE_AMOUNT, "Quantity below minimum trade amount");
        
        uint256 pricePerToken = assets[assetAddress].price;
        uint256 totalCost = (pricePerToken * quantity) / 10**8; // Convert price from USD to ETH equivalent
        
        // Calculate fees (0.1% of trade value)
        uint256 fees = (totalCost * FEE_PERCENTAGE) / 1000;
        uint256 totalWithFees = totalCost.add(fees);
        
        require(msg.value >= totalWithFees, "Insufficient ETH sent");
        
        // Update user portfolio
        portfolios[msg.sender].assets[assetAddress] = portfolios[msg.sender].assets[assetAddress].add(quantity);
        
        // Update asset supply and market cap
        assets[assetAddress].totalSupply = assets[assetAddress].totalSupply.add(quantity);
        assets[assetAddress].marketCap = (assets[assetAddress].price * assets[assetAddress].totalSupply) / 10**8;
        
        // Refund excess ETH
        if (msg.value > totalWithFees) {
            uint256 refund = msg.value.sub(totalWithFees);
            payable(msg.sender).transfer(refund);
        }
        
        // Transfer fees to owner
        if (fees > 0) {
            payable(owner()).transfer(fees);
        }
        
        emit TokensBought(msg.sender, assetAddress, quantity, totalWithFees);
    }

    /**
     * @dev Sells crypto tokens for ETH
     * @param assetAddress The address of the asset to sell
     * @param quantity The quantity to sell
     */
    function sellTokens(address assetAddress, uint256 quantity) external nonReentrant {
        require(assets[assetAddress].isActive, "Asset does not exist or inactive");
        require(quantity >= MIN_TRADE_AMOUNT, "Quantity below minimum trade amount");
        require(portfolios[msg.sender].assets[assetAddress] >= quantity, "Insufficient asset balance");
        
        uint256 pricePerToken = assets[assetAddress].price;
        uint256 totalValue = (pricePerToken * quantity) / 10**8; // Convert price from USD to ETH equivalent
        
        // Calculate fees (0.1% of trade value)
        uint256 fees = (totalValue * FEE_PERCENTAGE) / 1000;
        uint256 netValue = totalValue.sub(fees);
        
        // Update user portfolio
        portfolios[msg.sender].assets[assetAddress] = portfolios[msg.sender].assets[assetAddress].sub(quantity);
        portfolios[msg.sender].ethBalance = portfolios[msg.sender].ethBalance.add(netValue);
        
        // Update asset supply and market cap
        assets[assetAddress].totalSupply = assets[assetAddress].totalSupply.sub(quantity);
        assets[assetAddress].marketCap = (assets[assetAddress].price * assets[assetAddress].totalSupply) / 10**8;
        
        // Transfer fees to owner
        if (fees > 0) {
            payable(owner()).transfer(fees);
        }
        
        emit TokensSold(msg.sender, assetAddress, quantity, netValue);
    }

    /**
     * @dev Gets the current price of an asset
     * @param assetAddress The address of the asset
     * @return The price in USD * 10^8
     */
    function getAssetPrice(address assetAddress) external view returns (uint256) {
        return assets[assetAddress].price;
    }

    /**
     * @dev Gets the user's portfolio for a specific asset
     * @param user The user's address
     * @param assetAddress The asset's address
     * @return The quantity of the asset in the user's portfolio
     */
    function getUserAssetBalance(address user, address assetAddress) external view returns (uint256) {
        return portfolios[user].assets[assetAddress];
    }

    /**
     * @dev Gets the user's ETH balance in the contract
     * @param user The user's address
     * @return The ETH balance
     */
    function getUserEthBalance(address user) external view returns (uint256) {
        return portfolios[user].ethBalance;
    }

    /**
     * @dev Gets all supported assets
     * @return Array of supported asset addresses
     */
    function getSupportedAssets() external view returns (address[] memory) {
        return supportedAssets;
    }

    /**
     * @dev Gets user's complete portfolio
     * @param user The user's address
     * @return Arrays of asset addresses, balances, and their prices
     */
    function getUserPortfolio(address user) external view returns (address[] memory, uint256[] memory, uint256[] memory) {
        uint256 count = supportedAssets.length;
        address[] memory assetAddresses = new address[](count);
        uint256[] memory balances = new uint256[](count);
        uint256[] memory prices = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            address assetAddress = supportedAssets[i];
            assetAddresses[i] = assetAddress;
            balances[i] = portfolios[user].assets[assetAddress];
            prices[i] = assets[assetAddress].price;
        }
        
        return (assetAddresses, balances, prices);
    }

    /**
     * @dev Emergency function to withdraw ETH from the contract (only owner)
     * This is for emergency situations if ETH gets stuck
     */
    function withdrawETHFromContract(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient contract balance");
        payable(owner()).transfer(amount);
    }

    /**
     * @dev Emergency function to withdraw tokens from the contract (only owner)
     * This is for emergency situations if tokens get stuck
     */
    function withdrawTokensFromContract(address tokenAddress, uint256 amount) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        require(token.balanceOf(address(this)) >= amount, "Insufficient token balance");
        token.safeTransfer(owner(), amount);
    }

    /**
     * @dev Fallback function to receive ETH
     */
    receive() external payable {
        emit EthDeposited(msg.sender, msg.value);
    }
}