// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AbstractVault.sol";

/**
 * @title PersonalVault
 * @dev Native C2FLR Savings Vault.
 */
contract PersonalVault is AbstractVault {

    uint256 public unlockTimestamp;
    uint256 public penaltyBps; // Basis points (e.g. 500 = 5%)
    address public treasury; // Address to receive penalties

    event EarlyWithdrawal(address indexed user, uint256 amountWithdraw, uint256 penaltyPaid);
    event FullWithdrawal(address indexed user, uint256 amount);

    constructor(
        // No _token arg needed
        string memory _purpose,
        address _owner,
        uint256 _unlockTimestamp,
        uint256 _penaltyBps,
        address _treasury
    ) AbstractVault(_purpose, _owner) {
        require(_unlockTimestamp > block.timestamp, "Unlock time must be in future");
        require(_penaltyBps <= 10000, "Invalid basis points");
        
        unlockTimestamp = _unlockTimestamp;
        penaltyBps = _penaltyBps;
        treasury = _treasury;
    }

    /**
     * @dev Withdraws entire Native balance. 
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        if (block.timestamp >= unlockTimestamp) {
            // Success Case: Full withdrawal
            _sendNative(msg.sender, balance);
            
            emit Withdrawn(msg.sender, balance, block.timestamp, "MATURITY");
            emit FullWithdrawal(msg.sender, balance);
        } else {
            // Early Exit: Apply Penalty
            uint256 penalty = (balance * penaltyBps) / 10000;
            uint256 remaining = balance - penalty;

            if (penalty > 0) {
                _sendNative(treasury, penalty);
            }
            if (remaining > 0) {
                _sendNative(msg.sender, remaining);
            }

            emit Withdrawn(msg.sender, remaining, block.timestamp, "EARLY_EXIT");
            emit EarlyWithdrawal(msg.sender, remaining, penalty);
        }
    }

    function _sendNative(address to, uint256 amount) internal {
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "Native transfer failed");
    }
}
