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
    const USDT_ADDRESS = "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F";
    console.log(" Using TestToken at:", USDT_ADDRESS, "\n");

    // Use deployer address as protocol treasury (can be changed later)
    const protocolTreasury = deployer.address;
    console.log(" Protocol Treasury:", protocolTreasury, "\n");

    // Deploy VaultMetadata
    console.log(" Deploying VaultMetadata...");
    const VaultMetadata = await ethers.getContractFactory("VaultMetadata");
    const metadata = await VaultMetadata.deploy();
    await metadata.waitForDeployment();

    const metadataAddress = await metadata.getAddress();
    console.log(" VaultMetadata deployed to:", metadataAddress);

    // Deploy VaultFactory
    console.log(" Deploying VaultFactory...");
    const VaultFactory = await ethers.getContractFactory("VaultFactory");
    const factory = await VaultFactory.deploy(USDT_ADDRESS, protocolTreasury, metadataAddress);
    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();
    console.log(" VaultFactory deployed to:", factoryAddress);

    const fs = require("fs");
    fs.writeFileSync("deployed_factory.txt", factoryAddress);
    fs.appendFileSync("deployed_factory.txt", `\nVaultMetadata: ${metadataAddress}`);

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
