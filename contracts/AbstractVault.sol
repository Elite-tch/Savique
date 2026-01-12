// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AbstractVault
 * @dev Base contract for all SafeVault types. 
 *      simplified to handle ONLY Native C2FLR.
 */
abstract contract AbstractVault is Ownable, ReentrancyGuard {
    
    string public purpose;
    
    // Events
    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 timestamp, string typeOfWithdrawal);
    event VaultInitialized(string purpose);

    constructor(string memory _purpose, address _owner) Ownable(_owner) {
        purpose = _purpose;
        emit VaultInitialized(_purpose);
    }

    /**
     * @dev Core deposit function. Accepts Native C2FLR.
     */
    function deposit() external payable virtual nonReentrant {
        require(msg.value > 0, "Amount must be > 0");
        emit Deposited(msg.sender, msg.value, block.timestamp);
        _onDeposit(msg.sender, msg.value);
    }

    /**
     * @dev Hook for child contracts
     */
    function _onDeposit(address _user, uint256 _amount) internal virtual {}

    /**
     * @dev Returns total Native balance of the vault
     */
    function totalAssets() public view virtual returns (uint256) {
        return address(this).balance;
    }
    
    // Allow receiving native tokens directly
    receive() external payable {
        if(msg.value > 0) {
            emit Deposited(msg.sender, msg.value, block.timestamp);
            _onDeposit(msg.sender, msg.value);
        }
    }
}
