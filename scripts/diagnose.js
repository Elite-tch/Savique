const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const factoryAddrLegacy = "0xF5C64d5A6aeE90646A85cF3D01225e52AfEDA40eb";
    const usdtAddrLegacy = "0xCD92F943B0e809730E1882e35beAbD5e102bec52";
    const userAddr = "0xc9B5A83b5Dc3aC7056856E69283d1DAFF990Bec4"; // From user error log

    let output = "";

    // 1. Checksum Addresses
    let factoryChecksum = "";
    let usdtChecksum = "";
    try {
        factoryChecksum = ethers.getAddress(factoryAddrLegacy.toLowerCase());
        output += `Factory Checksum: ${factoryChecksum}\n`;
    } catch (e) {
        output += `Factory Error: ${e.message}\n`;
    }

    try {
        usdtChecksum = ethers.getAddress(usdtAddrLegacy.toLowerCase());
        output += `USDT Checksum: ${usdtChecksum}\n`;
    } catch (e) {
        output += `USDT Error: ${e.message}\n`;
    }

    // 2. Query Chain Data for USDT
    if (usdtChecksum) {
        try {
            const abi = [
                "function decimals() view returns (uint8)",
                "function balanceOf(address) view returns (uint256)",
                "function symbol() view returns (string)"
            ];
            const usdtContract = await ethers.getContractAt(abi, usdtChecksum);

            const decimals = await usdtContract.decimals();
            const symbol = await usdtContract.symbol();
            const balance = await usdtContract.balanceOf(userAddr);

            output += `USDT Symbol: ${symbol}\n`;
            output += `USDT Decimals: ${decimals}\n`;
            output += `User Balance (Raw): ${balance.toString()}\n`;
        } catch (e) {
            output += `Chain Query Error: ${e.message}\n`;
        }
    }

    fs.writeFileSync("diagnostics.txt", output);
    console.log("Diagnostics written to diagnostics.txt");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
