const { ethers } = require("hardhat");

async function main() {
    const usdtAddr = "0xCD92F943B0e809730E1882e35beAbD5e102bec52";
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
