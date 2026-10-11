
const hre = require("hardhat");

async function main() {
  const contract = await hre.ethers.deployContract(
    "SecureVehicleRegistry"
  );

  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("Secure Vehicle Registry deployed!");
  console.log("Contract address:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
