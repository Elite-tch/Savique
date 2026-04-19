// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title VaultMetadata
 * @dev Handles the generation of on-chain metadata for Savique Savings NFTs.
 *      Separated to stay within the contract size limits.
 */
contract VaultMetadata {
    using Strings for uint256;

    function generateTokenURI(
        uint256 tokenId, 
        string memory purpose, 
        uint256 balance,
        uint256 unlockTimestamp,
        uint256 lastUpdated
    ) public pure returns (string memory) {
        // Trim purpose if too long
        string memory trimmedPurpose = purpose;
        if (bytes(purpose).length > 20) {
            trimmedPurpose = string(abi.encodePacked(_substring(purpose, 0, 12), "..."));
        }

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 500 500">',
            '<defs>',
            '<linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:#1E1B4B;stop-opacity:1" />', 
            '<stop offset="100%" style="stop-color:#18181B;stop-opacity:1" />',
            '</linearGradient>',
            '<filter id="glow" x="-20%" y="-20%" width="140%" height="140%">',
            '<feGaussianBlur in="SourceGraphic" stdDeviation="25" />',
            '</filter>',
            '</defs>',
            // Background Layer
            '<rect width="500" height="500" fill="#09090B" />',
            '<ellipse cx="400" cy="150" rx="150" ry="100" fill="#E62058" opacity="0.15" filter="url(#glow)" />',
            '<ellipse cx="100" cy="400" rx="100" ry="80" fill="#E62058" opacity="0.1" filter="url(#glow)" />',
            // The Card
            '<rect x="60" y="70" width="380" height="370" rx="40" fill="url(#cardGrad)" stroke="white" stroke-opacity="0.1" />',
            '<rect x="60" y="70" width="380" height="370" rx="40" fill="white" opacity="0.03" />',

            // Brand Title
            '<text x="100" y="118" fill="white" font-family="Verdana, sans-serif" font-size="30" font-weight="900" letter-spacing="1">SAVIQUE</text>',

            // Tagline — tight under title
            '<text x="100" y="136" fill="white" font-family="Verdana, sans-serif" font-size="10" font-weight="bold" opacity="0.6" letter-spacing="2">PROTECTING YOUR FUTURE</text>',

            // Purpose (The Goal) — closer to tagline
            '<text x="100" y="200" fill="white" font-family="Georgia, serif" font-size="32" font-weight="bold">', trimmedPurpose, '</text>',

            // Balance Section — tighter
            '<text x="100" y="262" fill="white" font-family="Verdana, sans-serif" font-size="11" opacity="0.5" font-weight="bold">CURRENT COMMITMENT</text>',
            '<text x="100" y="305" fill="#E62058" font-family="Verdana, sans-serif" font-size="38" font-weight="900">', (balance / 1e6).toString(), '.', ((balance % 1e6) / 1e4).toString(), ' USDT0</text>',

            // Footer divider
            '<rect x="80" y="355" width="340" height="1" fill="white" opacity="0.1" />',

            // Footer text
            '<text x="100" y="382" fill="white" font-family="Verdana, sans-serif" font-size="12" font-weight="bold" opacity="0.6">NFT #', tokenId.toString(), '</text>',
            '<text x="380" y="382" fill="white" font-family="Verdana, sans-serif" font-size="12" font-weight="bold" opacity="0.6" text-anchor="end">MATURES: ', _formatDate(unlockTimestamp), '</text>',

            '</svg>'
        ));

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name": "Savique Vault #', tokenId.toString(), '", ',
            '"description": "A premium savings vault for ', purpose, '.", ',
            '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '", ',
            '"attributes": [',
                '{"trait_type": "Goal", "value": "', purpose, '"}, ',
                '{"trait_type": "Balance", "value": "', (balance / 1e6).toString(), '"}, ',
                '{"trait_type": "Maturity", "display_type": "date", "value": ', unlockTimestamp.toString(), '}, ',
                '{"trait_type": "Version", "value": "', lastUpdated.toString(), '"}',
            ']}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function _substring(string memory str, uint startIndex, uint endIndex) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }

    function _formatDate(uint256 timestamp) internal pure returns (string memory) {
        // Accurate Gregorian calendar (Howard Hinnant's civil calendar algorithm)
        uint256 z = timestamp / 86400 + 719468;
        uint256 era = z / 146097;
        uint256 doe = z - era * 146097;
        uint256 yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        uint256 y = yoe + era * 400;
        uint256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        uint256 mp = (5 * doy + 2) / 153;
        uint256 d = doy - (153 * mp + 2) / 5 + 1;
        uint256 m = mp < 10 ? mp + 3 : mp - 9;
        if (m <= 2) { y += 1; }

        return string(abi.encodePacked(
            d.toString(), "/",
            m.toString(), "/",
            y.toString()
        ));
    }
}
