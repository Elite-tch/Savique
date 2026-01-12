const { ethers } = require("hardhat");

async function main() {
    const usdtAddr = "0x479854495cefBc8D12B971A3Ec4d18E6dbcE81a3";
    const abi = ["function decimals() view returns (uint8)"];

    try {
        const contract = await ethers.getContractAt(abi, usdtAddr);
        const decimals = await contract.decimals();
        console.log("DECIMALS:", decimals);
    } catch (e) {
        console.log("ERROR:", e.message);
    }
}

main();
