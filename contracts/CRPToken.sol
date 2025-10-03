// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CRPToken
 * @dev Governance token for the Crypto Trading Platform
 * This token has voting powers and is used for platform governance
 */
contract CRPToken is ERC20Capped, ERC20Burnable, Ownable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    mapping(bytes32 => mapping(address => bool)) private _hasRole;

    constructor() 
        ERC20("Crypto Trading Platform Token", "CRP")
        ERC20Capped(100_000_000 * 10**decimals())  // Set the cap in the constructor
    {
        transferOwnership(msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(BURNER_ROLE, msg.sender);
        
        // Mint initial supply to deployer (10% of cap for initial distribution)
        _mint(msg.sender, 10_000_000 * 10**decimals());
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    /**
     * @dev Creates `amount` new tokens for `to`
     * See {ERC20-_mint}
     *
     * Requirements:
     * - the caller must have the `MINTER_ROLE`
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Destroys `amount` tokens from the caller
     * See {ERC20-_burn}
     * 
     * Requirements:
     * - the caller must have the `BURNER_ROLE`
     */
    function burnTokens(address from, uint256 amount) public onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }
    
    /**
     * @dev Check if account has a specific role
     */
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _hasRole[role][account];
    }
    
    /**
     * @dev Set up a role for an account
     */
    function _setupRole(bytes32 role, address account) internal {
        _hasRole[role][account] = true;
    }
    
    /**
     * @dev Modifier to check if caller has a specific role
     */
    modifier onlyRole(bytes32 role) {
        require(_hasRole[role][msg.sender], "CRPToken: caller does not have the required role");
        _;
    }

    // Override the _mint function to resolve conflict
    function _mint(address account, uint256 amount) internal override(ERC20, ERC20Capped) {
        super._mint(account, amount);
    }
}