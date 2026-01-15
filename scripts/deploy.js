const hre = require("hardhat");

async function main() {
    const ethers = hre.ethers;
    console.log(" Deploying SafeVault contracts to Coston2...\n");

    const [deployer] = await ethers.getSigners();
    console.log(" Deploying with account:", deployer.address);

    // Get deployer balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(" Account balance:", ethers.formatEther(balance), "C2FLR\n");

    // TestToken address on Coston2
    const USDT_ADDRESS = "0xCD92F943B0e809730E1882e35beAbD5e102bec52";
    console.log(" Using TestToken at:", USDT_ADDRESS, "\n");

    // Use deployer address as protocol treasury (can be changed later)
    const protocolTreasury = deployer.address;
    console.log(" Protocol Treasury:", protocolTreasury, "\n");

    // Deploy VaultFactory
    console.log(" Deploying VaultFactory...");
    const VaultFactory = await ethers.getContractFactory("VaultFactory");
    const factory = await VaultFactory.deploy(USDT_ADDRESS, protocolTreasury);
    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();
    console.log(" VaultFactory deployed to:", factoryAddress);

    const fs = require("fs");
    fs.writeFileSync("deployed_factory.txt", factoryAddress);

    console.log("\n🎉 Deployment Complete!\n");
    console.log(" Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("VaultFactory:", factoryAddress);
    console.log("USDT0 Token:", USDT_ADDRESS);
    console.log("Network: Coston2 (Chain ID: 114)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log(" Next Steps:");
    console.log("1. Update lib/contracts.ts with VaultFactory address:");
    console.log(`   VaultFactory: "${factoryAddress}"`);
    console.log("\n2. Verify contracts (optional):");
    console.log(`   npx hardhat verify --network coston2 ${factoryAddress}`);
    console.log("\n3. Test creating a vault from the frontend!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(" Deployment failed:", error);
        process.exit(1);
    });
