const hre = require("hardhat");

async function main() {
    const USDT_ADDRESS = "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F";
    const token = await hre.ethers.getContractAt([
        "function decimals() view returns (uint8)"
    ], USDT_ADDRESS);
    const decimals = await token.decimals();
    console.log("USDT0 Decimals:", decimals);
}

main().catch(console.error);
