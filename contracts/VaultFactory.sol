// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PersonalVault.sol";
import "./IVaultFactory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "./VaultMetadata.sol";

/**
 * @title VaultFactory
 * @dev Deploys Savings Vaults and represents them as tradeable NFTs.
 */
contract VaultFactory is IVaultFactory, ERC721Royalty, Ownable {
    using SafeERC20 for IERC20;

    address public immutable usdtToken; // USDT token address
    address public protocolTreasury;
    address public metadataGenerator;
    
    address[] public allVaults;
    mapping(address => bool) public isVault;
    mapping(uint256 => address) public vaultAddress;
    mapping(uint256 => uint256) public lastUpdate; // Tracks last deposit time for cache busting
    mapping(address => address[]) public userVaults;
    
    uint256 private _nextTokenId;

    event PersonalVaultCreated(
        address indexed vaultAddress, 
        address indexed owner, 
        uint256 indexed tokenId,
        string purpose, 
        uint256 unlockTime
    );

    constructor(address _usdtToken, address _protocolTreasury, address _metadata) 
        ERC721("Savique Savings NFT", "SAVIQ") 
        Ownable(msg.sender) 
    {
        require(_usdtToken != address(0), "Invalid USDT address");
        require(_protocolTreasury != address(0), "Invalid treasury address");
        require(_metadata != address(0), "Invalid metadata address");
        
        usdtToken = _usdtToken;
        protocolTreasury = _protocolTreasury;
        metadataGenerator = _metadata;
        
        _setDefaultRoyalty(_protocolTreasury, 250); // 2.5% royalty
    }

    /**
     * @dev Creates a new personal vault and mints a representative NFT
     */
    function createPersonalVault(
        string memory _purpose,
        uint256 _unlockTimestamp,
        uint256 _penaltyBps,
        uint256 _initialDeposit,
        address _beneficiary
    ) external returns (address) {
        uint256 tokenId = _nextTokenId++;
        
        PersonalVault vault = new PersonalVault(
            usdtToken,
            _purpose,
            tokenId,
            _unlockTimestamp,
            _penaltyBps,
            protocolTreasury,
            _beneficiary
        );

        address vaultAddr = address(vault);
        allVaults.push(vaultAddr);
        vaultAddress[tokenId] = vaultAddr;
        isVault[vaultAddr] = true;

        _safeMint(msg.sender, tokenId);

        if (_initialDeposit > 0) {
            IERC20(usdtToken).safeTransferFrom(msg.sender, vaultAddr, _initialDeposit);
        }

        emit PersonalVaultCreated(vaultAddr, msg.sender, tokenId, _purpose, _unlockTimestamp);
        return vaultAddr;
    }

    /**
     * @dev Generates dynamic on-chain metadata for the Savings NFT
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        address vault = vaultAddress[tokenId];
        PersonalVault v = PersonalVault(payable(vault));
        string memory purpose = v.purpose();
        uint256 balance = v.totalAssets();
        uint256 unlockTime = v.unlockTimestamp();
        uint256 updated = lastUpdate[tokenId];
        
        return VaultMetadata(metadataGenerator).generateTokenURI(tokenId, purpose, balance, unlockTime, updated);
    }

    /**
     * @dev Called by a vault to signal a change (for cache busting NFT metadata)
     */
    function notifyUpdate(uint256 _tokenId) external {
        require(vaultAddress[_tokenId] == msg.sender, "Only vault");
        lastUpdate[_tokenId] = block.timestamp;
    }

    /**
     * @dev Hook that is called before any token transfer. 
     * Handles the synchronization of the legacy userVaults mapping.
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        
        address vault = vaultAddress[tokenId];
        if (from != address(0)) {
            _removeFromUserVaults(from, vault);
        }
        if (to != address(0)) {
            userVaults[to].push(vault);
        }
        
        return from;
    }

    function _removeFromUserVaults(address user, address vault) internal {
        address[] storage vaults = userVaults[user];
        for (uint256 i = 0; i < vaults.length; i++) {
            if (vaults[i] == vault) {
                vaults[i] = vaults[vaults.length - 1];
                vaults.pop();
                break;
            }
        }
    }

    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }

    function getUserVaults(address _user) external view returns (address[] memory) {
        return userVaults[_user];
    }

    function triggerBeneficiaryClaim(address _vault) external onlyOwner {
        PersonalVault(payable(_vault)).claimByBeneficiary();
    }

    /**
     * @dev Allows a vault to burn its own NFT when it's closed (fully withdrawn)
     */
    function burnVaultNFT(uint256 tokenId) external {
        address vault = vaultAddress[tokenId];
        require(msg.sender == vault, "Only vault can burn its NFT");
        
        _burn(tokenId);
        
        // Cleanup mappings
        isVault[vault] = false;
        delete vaultAddress[tokenId];
        // Note: we don't remove from allVaults array to keep history
    }

    function executeAutoDeposit(address _vault, uint256 _amount) external onlyOwner {
        require(isVault[_vault], "Not a system vault");
        address vaultOwner = PersonalVault(payable(_vault)).owner();
        IERC20(usdtToken).safeTransferFrom(vaultOwner, _vault, _amount);
        PersonalVault(payable(_vault)).depositFromFactory(_amount);
    }

    /**
     * @dev Allows owner to update the metadata generator contract
     */
    function updateMetadataGenerator(address _newMetadata) external onlyOwner {
        require(_newMetadata != address(0), "Invalid address");
        metadataGenerator = _newMetadata;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Royalty, IERC165) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
