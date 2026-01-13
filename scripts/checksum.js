const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const factoryAddr = "0xF5C64d5A6aeE90646A85cF3D01225e52AfEDA40eb";
    const usdtAddr = "0xCD92F943B0e809730E1882e35beAbD5e102bec52";

    let output = "";
    try {
        output += "Factory: " + ethers.getAddress(factoryAddr) + "\n";
    } catch (e) {
        output += "Factory Error: " + e.message + "\n";
    }

    try {
        output += "USDT0: " + ethers.getAddress(usdtAddr) + "\n";
    } catch (e) {
        output += "USDT Error: " + e.message + "\n";
    }

    fs.writeFileSync("addresses.txt", output);
}

main();
