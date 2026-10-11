
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { ethers } = require("ethers");
const contractJSON = require("./contract/SecureVehicleRegistry.json");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL || "http://127.0.0.1:8545"
);

const contractAddress = process.env.CONTRACT_ADDRESS;

let contract;
let signer;

async function connectBlockchain() {
  const accounts = await provider.listAccounts();

  if (accounts.length === 0) {
    throw new Error("No Hardhat accounts available");
  }

  // Development only: use the first local Hardhat test account.
  signer = accounts[0];

  contract = new ethers.Contract(
    contractAddress,
    contractJSON.abi,
    signer
  );

  await provider.getNetwork();

  console.log("Connected to local blockchain");
  console.log("Contract:", contractAddress);
  console.log("Signer:", await signer.getAddress());
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Secure Vehicle Registration API is running"
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const network = await provider.getNetwork();

    res.json({
      success: true,
      blockchain: "connected",
      chainId: network.chainId.toString(),
      contractAddress
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Blockchain unavailable",
      error: error.message
    });
  }
});

function hashValue(value) {
  return ethers.keccak256(ethers.toUtf8Bytes(value.trim()));
}

app.post("/api/vehicles", async (req, res) => {
  try {
    const {
      registrationNumber,
      chassisNumber,
      manufacturer,
      model,
      manufacturingYear,
      ownerIdentifier
    } = req.body;

    if (
      !registrationNumber ||
      !chassisNumber ||
      !manufacturer ||
      !model ||
      !ownerIdentifier ||
      !Number.isInteger(Number(manufacturingYear))
    ) {
      return res.status(400).json({
        success: false,
        message: "All vehicle fields are required"
      });
    }

    const year = Number(manufacturingYear);

    if (year < 1886 || year > new Date().getFullYear()) {
      return res.status(400).json({
        success: false,
        message: "Invalid manufacturing year"
      });
    }

    const registration = registrationNumber.trim().toUpperCase();
    const chassisHash = hashValue(chassisNumber);
    const ownerHash = hashValue(ownerIdentifier);

    // Check duplicate registration before sending a transaction.
    try {
      await contract.getVehicle(registration);

      return res.status(409).json({
        success: false,
        message: "Vehicle is already registered"
      });
    } catch (error) {
      if (!String(error).includes("Vehicle not found")) {
        // Continue only when the contract confirms that the
        // vehicle does not exist. RPC errors must not be ignored.
        if (
          error.reason !== "Vehicle not found" &&
          error.shortMessage !== "execution reverted (unknown custom error)"
        ) {
          throw error;
        }
      }
    }

    const tx = await contract.registerVehicle(
      registration,
      chassisHash,
      manufacturer.trim(),
      model.trim(),
      year,
      ownerHash
    );

    const receipt = await tx.wait();

    res.status(201).json({
      success: true,
      message: "Vehicle registered on blockchain",
      registrationNumber: registration,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Vehicle registration failed",
      error: error.shortMessage || error.message
    });
  }
});

app.post("/api/vehicles/verify", async (req, res) => {
  try {
    const { registrationNumber, chassisNumber } = req.body;

    if (!registrationNumber || !chassisNumber) {
      return res.status(400).json({
        success: false,
        message: "Registration number and chassis number are required"
      });
    }

    const registration = registrationNumber.trim().toUpperCase();
    const chassisHash = hashValue(chassisNumber);

    const verified = await contract.verifyVehicle(
      registration,
      chassisHash
    );

    res.json({
      success: true,
      registrationNumber: registration,
      verified,
      message: verified
        ? "Vehicle verified successfully"
        : "Vehicle not verified"
    });
  } catch (error) {
    console.error("Verification error:", error);

    res.status(500).json({
      success: false,
      message: "Vehicle verification failed"
    });
  }
});

app.get("/api/vehicles/:registrationNumber", async (req, res) => {
  try {
    const registration =
      req.params.registrationNumber.trim().toUpperCase();

    const vehicle = await contract.getVehicle(registration);

    res.json({
      success: true,
      vehicle: {
        registrationNumber: vehicle.registrationNumber,
        chassisHash: vehicle.chassisHash,
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
        manufacturingYear: Number(vehicle.manufacturingYear),
        registeredAt: Number(vehicle.registeredAt),
        active: vehicle.active
      }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: "Vehicle not found"
    });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const totalVehicles = await contract.totalVehicles();

    res.json({
      success: true,
      totalVehicles: totalVehicles.toString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Could not retrieve blockchain statistics"
    });
  }
});

async function startServer() {
  try {
    if (!contractAddress) {
      throw new Error("CONTRACT_ADDRESS missing in .env");
    }

    await connectBlockchain();

    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
