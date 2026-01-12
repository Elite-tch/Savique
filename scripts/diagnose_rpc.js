const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const usdtAddr = "0xCD92F943B0e809730E1882e35beAbD5e102bec52";
    const userAddr = "0xc9B5A83b5Dc3aC7056856E69283d1DAFF990Bec4";

    // Direct JsonRpcProvider
    const provider = new ethers.JsonRpcProvider("https://coston2-api.flare.network/ext/C/rpc");

    let output = "";

    try {
        const abi = [
            "function decimals() view returns (uint8)",
            "function balanceOf(address) view returns (uint256)",
            "function symbol() view returns (string)",
            "function name() view returns (string)"
        ];

        const usdtContract = new ethers.Contract(usdtAddr, abi, provider);

        const symbol = await usdtContract.symbol();
        const name = await usdtContract.name();
        const decimals = await usdtContract.decimals();
        const balance = await usdtContract.balanceOf(userAddr);

        output += `Address: ${usdtAddr}\n`;
        output += `Name: ${name}\n`;
        output += `Symbol: ${symbol}\n`;
        output += `Decimals: ${decimals}\n`;
        output += `User Balance: ${ethers.formatUnits(balance, decimals)}\n`;
        output += `User Balance (Raw): ${balance.toString()}\n`;

    } catch (e) {
        output += `Error: ${e.message}\n`;
    }

    fs.writeFileSync("diagnostics_rpc.txt", output);
    console.log("Diagnostics written.");
}

main();
