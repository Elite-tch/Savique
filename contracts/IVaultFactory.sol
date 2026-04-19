// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IVaultFactory is IERC721 {
    function isVault(address vault) external view returns (bool);
    function burnVaultNFT(uint256 tokenId) external;
    function notifyUpdate(uint256 tokenId) external;
}
