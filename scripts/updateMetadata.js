const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const ethers = hre.ethers;
    console.log("🎨 Redeploying VaultMetadata (NFT art update)...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "C2FLR\n");

    // Read existing VaultFactory address
    const FACTORY_ADDRESS = "0x041Bd03Ae9C1E8C0E9C8aa12F0Cd1646850cC521";
    console.log("Existing VaultFactory:", FACTORY_ADDRESS);

    // Deploy new VaultMetadata
    console.log("\n📦 Deploying new VaultMetadata...");
    const VaultMetadata = await ethers.getContractFactory("VaultMetadata");
    const metadata = await VaultMetadata.deploy();
    await metadata.waitForDeployment();

    const newMetadataAddress = await metadata.getAddress();
    console.log("✅ New VaultMetadata deployed to:", newMetadataAddress);

    // Update the VaultFactory to point to the new metadata contract
    console.log("\n🔄 Updating VaultFactory to use new metadata...");
    const VaultFactory = await ethers.getContractFactory("VaultFactory");
    const factory = VaultFactory.attach(FACTORY_ADDRESS);

    const tx = await factory.updateMetadataGenerator(newMetadataAddress);
    await tx.wait();
    console.log("✅ VaultFactory updated! Tx:", tx.hash);

    // Update the deployed_factory.txt
    const oldContent = fs.readFileSync("deployed_factory.txt", "utf8");
    const newContent = oldContent.replace(
        /VaultMetadata: .+/,
        `VaultMetadata: ${newMetadataAddress}`
    );
    fs.writeFileSync("deployed_factory.txt", newContent);

    console.log("\n🎉 NFT Art Updated Successfully!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("VaultFactory:    ", FACTORY_ADDRESS);
    console.log("New VaultMetadata:", newMetadataAddress);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\nYour NFTs now display the updated shield/heart icon! 🛡️❤️");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Update failed:", error);
        process.exit(1);
    });
