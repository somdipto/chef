// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CryptoToken
 * @dev Mock token to represent crypto assets in the exchange
 */
contract CryptoToken is ERC20, Ownable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) Ownable(msg.sender) {
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

    // Events for tracking important operations
    event AssetAdded(address indexed assetAddress, string name, uint256 initialPrice);
    event AssetPriceUpdated(address indexed assetAddress, uint256 newPrice);
    event TokensBought(address indexed buyer, address indexed asset, uint256 quantity, uint256 ethSpent);
    event TokensSold(address indexed seller, address indexed asset, uint256 quantity, uint256 ethReceived);
    event EthDeposited(address indexed user, uint256 amount);
    event EthWithdrawn(address indexed user, uint256 amount);

    /**
     * @dev Initializes the contract with an exchange token
     */
    constructor(address _exchangeTokenAddress) Ownable(msg.sender) {
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
        require(!assets[assetAddress].isActive, "Asset already exists");
        
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
     * @dev Updates the price of a crypto asset
     * @param assetAddress The address of the crypto asset
     * @param newPrice The new price in USD * 10^8
     */
    function updateAssetPrice(address assetAddress, uint256 newPrice) external onlyOwner {
        require(assets[assetAddress].isActive, "Asset does not exist or inactive");
        require(newPrice > 0, "Price must be greater than 0");
        
        assets[assetAddress].price = newPrice;
        emit AssetPriceUpdated(assetAddress, newPrice);
    }

    /**
     * @dev Deposits ETH into the user's portfolio
     */
    function depositEth() external payable nonReentrant {
        require(msg.value > 0, "Must send ETH to deposit");
        portfolios[msg.sender].ethBalance += msg.value;
        emit EthDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Withdraws ETH from the user's portfolio
     * @param amount The amount of ETH to withdraw
     */
    function withdrawEth(uint256 amount) external nonReentrant {
        require(portfolios[msg.sender].ethBalance >= amount, "Insufficient ETH balance");
        portfolios[msg.sender].ethBalance -= amount;
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
        uint256 totalWithFees = totalCost + fees;
        
        require(msg.value >= totalWithFees, "Insufficient ETH sent");
        
        // Update user portfolio
        portfolios[msg.sender].assets[assetAddress] += quantity;
        
        // Update asset supply and market cap
        assets[assetAddress].totalSupply += quantity;
        assets[assetAddress].marketCap = (assets[assetAddress].price * assets[assetAddress].totalSupply) / 10**8;
        
        // Refund excess ETH
        if (msg.value > totalWithFees) {
            payable(msg.sender).transfer(msg.value - totalWithFees);
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
        uint256 netValue = totalValue - fees;
        
        // Update user portfolio
        portfolios[msg.sender].assets[assetAddress] -= quantity;
        portfolios[msg.sender].ethBalance += netValue;
        
        // Update asset supply and market cap
        assets[assetAddress].totalSupply -= quantity;
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
     * @dev Fallback function to receive ETH
     */
    receive() external payable {
        emit EthDeposited(msg.sender, msg.value);
    }
}