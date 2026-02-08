// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PersonalVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VaultFactory
 * @dev Deploys ERC-20 Token (USDT) Vaults.
 */
contract VaultFactory is Ownable {
    using SafeERC20 for IERC20;

    address public immutable usdtToken; // USDT token address on Coston2
    address[] public allVaults;
    mapping(address => bool) public isVault;
    mapping(address => address[]) public userVaults;

    address public protocolTreasury;

    event PersonalVaultCreated(
        address indexed vaultAddress, 
        address indexed owner, 
        string purpose, 
        uint256 unlockTime,
        address beneficiary
    );

    /**
     * @param _usdtToken Address of USDT token on Coston2
     * @param _protocolTreasury Address to receive early withdrawal penalties
     */
    constructor(address _usdtToken, address _protocolTreasury) Ownable(msg.sender) {
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
     * @param _initialDeposit Amount to deposit immediately (requires approval)
     * @return Address of the newly created vault
     */
    function createPersonalVault(
        string memory _purpose,
        uint256 _unlockTimestamp,
        uint256 _penaltyBps,
        uint256 _initialDeposit,
        address _beneficiary
    ) external returns (address) {
        PersonalVault vault = new PersonalVault(
            usdtToken,
            _purpose,
            msg.sender,
            _unlockTimestamp,
            _penaltyBps,
            protocolTreasury,
            _beneficiary
        );

        address vaultAddr = address(vault);
        allVaults.push(vaultAddr);
        userVaults[msg.sender].push(vaultAddr);
        isVault[vaultAddr] = true;

        if (_initialDeposit > 0) {
            IERC20(usdtToken).safeTransferFrom(msg.sender, vaultAddr, _initialDeposit);
        }

        emit PersonalVaultCreated(vaultAddr, msg.sender, _purpose, _unlockTimestamp, _beneficiary);
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

    /**
     * @dev Admin function to trigger beneficiary claim
     */
    function triggerBeneficiaryClaim(address _vault) external onlyOwner {
        PersonalVault(payable(_vault)).claimByBeneficiary();
    }
}
