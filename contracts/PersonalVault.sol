// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AbstractVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PersonalVault
 * @dev ERC-20 Token (USDT) Savings Vault with time-lock and early withdrawal penalty.
 */
contract PersonalVault is AbstractVault {
    using SafeERC20 for IERC20;

    IERC20 public immutable token; // The ERC-20 token (USDT)
    uint256 public unlockTimestamp;
    uint256 public penaltyBps; // Basis points (e.g. 500 = 5%)
    address public treasury; // Address to receive penalties
    address public beneficiary; // Emergency beneficiary
    address public factory; // Factory that deployed this vault
    uint256 public constant GRACE_PERIOD = 5 minutes; // TESTING (Production: 365 days)

    event EarlyWithdrawal(address indexed user, uint256 amountWithdraw, uint256 penaltyPaid);
    event FullWithdrawal(address indexed user, uint256 amount);
    event BeneficiaryClaimed(address indexed beneficiary, uint256 amount);

    constructor(
        address _token,
        string memory _purpose,
        address _owner,
        uint256 _unlockTimestamp,
        uint256 _penaltyBps,
        address _treasury,
        address _beneficiary
    ) AbstractVault(_purpose, _owner) {
        require(_token != address(0), "Invalid token address");
        require(_unlockTimestamp > block.timestamp, "Unlock time must be in future");
        require(_penaltyBps <= 10000, "Invalid basis points");
        
        token = IERC20(_token);
        unlockTimestamp = _unlockTimestamp;
        penaltyBps = _penaltyBps;
        treasury = _treasury;
        beneficiary = _beneficiary;
        factory = msg.sender;
    }

    /**
     * @dev Deposit ERC-20 tokens into the vault
     * @param amount Amount of tokens to deposit
     */
    function deposit(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from user to vault
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        emit Deposited(msg.sender, amount, block.timestamp);
        _onDeposit(msg.sender, amount);
    }

    /**
     * @dev Triggers a deposit from the owner's wallet using open allowance.
     * Can be called by the Owner (manual) or the Factory/Admin (auto-save).
     */
    /**
     * @dev Called by the factory to record a deposit pushed to this vault.
     */
    function depositFromFactory(uint256 amount) external nonReentrant {
        require(msg.sender == factory, "Only Factory");
        require(amount > 0, "Amount > 0");
        
        emit Deposited(owner(), amount, block.timestamp);
        _onDeposit(owner(), amount);
    }

    /**
     * @dev Withdraws entire token balance
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");

        if (block.timestamp >= unlockTimestamp) {
            // Success Case: Full withdrawal
            token.safeTransfer(msg.sender, balance);
            
            emit Withdrawn(msg.sender, balance, block.timestamp, "MATURITY");
            emit FullWithdrawal(msg.sender, balance);
        } else {
            // Early Exit: Apply Penalty
            uint256 penalty = (balance * penaltyBps) / 10000;
            uint256 remaining = balance - penalty;

            if (penalty > 0) {
                token.safeTransfer(treasury, penalty);
            }
            if (remaining > 0) {
                token.safeTransfer(msg.sender, remaining);
            }

            emit Withdrawn(msg.sender, remaining, block.timestamp, "EARLY_EXIT");
            emit EarlyWithdrawal(msg.sender, remaining, penalty);
        }
    }

    /**
     * @dev Returns the total assets (token balance) in the vault
     */
    function totalAssets() public view override returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @dev Allows factory admin to trigger beneficiary claim after grace period
     */
    function claimByBeneficiary() external nonReentrant {
        require(msg.sender == factory, "Only factory admin");
        require(beneficiary != address(0), "No beneficiary set");
        require(block.timestamp > unlockTimestamp + GRACE_PERIOD, "Grace period not over");
        
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No funds to claim");

        token.safeTransfer(beneficiary, balance);
        emit BeneficiaryClaimed(beneficiary, balance);
    }
}
