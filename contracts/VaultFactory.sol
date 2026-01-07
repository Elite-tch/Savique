// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PersonalVault.sol";
import "./GroupVault.sol";

/**
 * @title VaultFactory
 * @dev Deploys Native C2FLR Vaults.
 */
contract VaultFactory {
    address[] public allVaults;
    mapping(address => bool) public isVault;
    mapping(address => address[]) public userVaults;

    address public protocolTreasury;

    event PersonalVaultCreated(address indexed vaultAddress, address indexed owner, string purpose, uint256 unlockTime);
    event GroupVaultCreated(address indexed vaultAddress, address indexed creator, string purpose, uint256 memberCount);

    constructor(address _protocolTreasury) {
        protocolTreasury = _protocolTreasury;
    }

    function createPersonalVault(
        string memory _purpose,
        uint256 _unlockTimestamp,
        uint256 _penaltyBps
    ) external returns (address) {
        PersonalVault vault = new PersonalVault(
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
    
    function createGroupVault(
        string memory _purpose,
        address[] memory _initialMembers,
        uint256 _approvalThreshold
    ) external returns (address) {
        GroupVault vault = new GroupVault(
            _purpose,
            _initialMembers,
            _approvalThreshold
        );

        address vaultAddr = address(vault);
        allVaults.push(vaultAddr);
        
        // Add to members
        for(uint256 i = 0; i < _initialMembers.length; i++) {
             userVaults[_initialMembers[i]].push(vaultAddr);
        }

        isVault[vaultAddr] = true;

        emit GroupVaultCreated(vaultAddr, msg.sender, _purpose, _initialMembers.length);
        return vaultAddr;
    }

    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }

    function getUserVaults(address _user) external view returns (address[] memory) {
        return userVaults[_user];
    }
}
