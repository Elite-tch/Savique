// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PersonalVault.sol";

/**
 * @title VaultFactory
 * @dev Deploys ERC-20 Token (USDT) Vaults.
 */
contract VaultFactory {
    address public immutable usdtToken; // USDT token address on Coston2
    address[] public allVaults;
    mapping(address => bool) public isVault;
    mapping(address => address[]) public userVaults;

    address public protocolTreasury;

    event PersonalVaultCreated(
        address indexed vaultAddress, 
        address indexed owner, 
        string purpose, 
        uint256 unlockTime
    );

    /**
     * @param _usdtToken Address of USDT token on Coston2
     * @param _protocolTreasury Address to receive early withdrawal penalties
     */
    constructor(address _usdtToken, address _protocolTreasury) {
        require(_usdtToken != address(0), "Invalid USDT address");
        require(_protocolTreasury != address(0), "Invalid treasury address");
        
        usdtToken = _usdtToken;
        protocolTreasury = _protocolTreasury;
    }

    /**
     * @dev Creates a new personal vault for USDT savings
     * @param _purpose Description of the vault's purpose
     * @param _unlockTimestamp Unix timestamp when vault unlocks
     * @param _penaltyBps Early withdrawal penalty in basis points (e.g., 500 = 5%)
     * @return Address of the newly created vault
     */
    function createPersonalVault(
        string memory _purpose,
        uint256 _unlockTimestamp,
        uint256 _penaltyBps
    ) external returns (address) {
        PersonalVault vault = new PersonalVault(
            usdtToken,
            _purpose,
            msg.sender,
            _unlockTimestamp,
            _penaltyBps,
            protocolTreasury
        );

        address vaultAddr = address(vault);
        allVaults.push(vaultAddr);
        userVaults[msg.sender].push(vaultAddr);
        isVault[vaultAddr] = true;

        emit PersonalVaultCreated(vaultAddr, msg.sender, _purpose, _unlockTimestamp);
        return vaultAddr;
    }
    
    /**
     * @dev Returns all vaults created by this factory
     */
    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }

    /**
     * @dev Returns all vaults owned by a specific user
     */
    function getUserVaults(address _user) external view returns (address[] memory) {
        return userVaults[_user];
    }
}
