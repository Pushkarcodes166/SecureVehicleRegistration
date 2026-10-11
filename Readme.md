# Secure Vehicle Registration Using Blockchain

A blockchain-based vehicle registration and verification system built using React, Express.js, Solidity, Hardhat and ethers.js. The application records vehicle details on a local Ethereum-compatible blockchain and verifies vehicles using their registration number and chassis number.

## Features

- Register a vehicle through a web interface.
- Store vehicle records in a Solidity smart contract.
- Hash chassis numbers and owner identifiers before storing them on-chain.
- Verify vehicles using registration and chassis details.
- Reject duplicate vehicle registrations.
- Retrieve vehicle records and their registration status.
- Display blockchain transaction details and vehicle statistics.
- Use a local blockchain without requiring MetaMask.

## Technology Stack

- Frontend: React, Vite, CSS
- Backend: Node.js, Express.js
- Blockchain: Solidity, Hardhat
- Blockchain interaction: ethers.js
- Development tools: Git, GitHub, VS Code

## Prerequisites

Install these tools on your computer:

1. Node.js LTS and npm
2. Git
3. A code editor such as Visual Studio Code

Check the installations:

```bash
node -v
npm -v
git --version
```

## Project Structure

```text
SecureVehicleRegistration/
├── blockchain/
│   ├── contracts/
│   │   └── SecureVehicleRegistry.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── hardhat.config.js
│   └── package.json
├── backend/
│   ├── contract/
│   │   └── SecureVehicleRegistry.json
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
├── .gitignore
└── README.md
```

## Installation and Setup

### Step 1: Clone the repository

Replace `YOUR_USERNAME` with the GitHub username that owns this repository.

```bash
git clone https://github.com/YOUR_USERNAME/SecureVehicleRegistration.git
cd SecureVehicleRegistration
```

### Step 2: Install blockchain dependencies

```bash
cd blockchain
npm install
npx hardhat compile
```

Compilation should complete successfully before deployment.

### Step 3: Start the local blockchain

Open Terminal 1 inside the `blockchain` folder:

```bash
npx hardhat node
```

Keep this terminal running. Hardhat starts a local blockchain on `http://127.0.0.1:8545`, normally using chain ID `31337`.

### Step 4: Deploy the smart contract

Open Terminal 2 in the `blockchain` folder:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Copy the contract address printed after successful deployment.

**Important:** Deploy the contract every time the local Hardhat node is restarted. A fresh node has a fresh blockchain state.

### Step 5: Configure the backend

Open Terminal 3 and navigate to the backend folder from the project root:

```bash
cd backend
npm install
```

Create a `.env` file by copying the example:

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

Update `backend/.env` with the deployed contract address:

```env
PORT=5000
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=PASTE_DEPLOYED_CONTRACT_ADDRESS_HERE
```

Make sure the address matches the contract deployed in Step 4.

The file `backend/contract/SecureVehicleRegistry.json` must contain the ABI generated from the current Solidity contract. If it is missing or outdated, regenerate it after compilation:

```powershell
Copy-Item ..\blockchain\artifacts\contracts\SecureVehicleRegistry.sol\SecureVehicleRegistry.json .\contract\SecureVehicleRegistry.json -Force
```

Start the backend:

```bash
npm run dev
```

The terminal should report that it connected to the local blockchain and that the backend is running on port 5000.

### Step 6: Start the frontend

Open Terminal 4. From the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

`http://localhost:5173`

Keep all required terminals running while using the application.

## API Endpoints

The backend normally runs on `http://localhost:5000`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Check whether the API is running |
| GET | `/api/health` | Check blockchain connectivity |
| POST | `/api/vehicles` | Register a vehicle |
| POST | `/api/vehicles/verify` | Verify a vehicle |
| GET | `/api/vehicles/:registrationNumber` | Retrieve a vehicle record |
| GET | `/api/stats` | Retrieve total registered vehicles |

You can open the following URLs in your browser to perform basic checks:

- `http://localhost:5000/`
- `http://localhost:5000/api/health`
- `http://localhost:5000/api/stats`

Registration and verification require POST requests, which the frontend sends.

## Demo Data

Use fictional details for testing:

- Registration number: `MH01AB1234`
- Chassis number: `CHASSIS-DEMO-2026-001`
- Manufacturer: `Tata Motors`
- Model: `Nexon`
- Manufacturing year: `2025`
- Owner identifier: `OWNER-DEMO-1001`

After registration, verify the vehicle using the same registration number and chassis number. Try an incorrect chassis number to confirm that verification fails.

## Troubleshooting

**Blockchain connection failed**

- Ensure `npx hardhat node` is still running.
- Confirm the RPC URL is `http://127.0.0.1:8545`.
- Ensure the backend is using the correct deployed contract address.

**Contract address or ABI error**

- Recompile the contract.
- Deploy it to the running local network.
- Update `CONTRACT_ADDRESS` in `backend/.env`.
- Regenerate the ABI JSON if it is outdated.

**Port already in use**

- Check whether another application is using port 5000 or the Vite development port.
- Stop the conflicting process or configure a different port consistently.

**Vehicle records disappeared**

- Restarting the local Hardhat node creates a new chain state.
- Redeploy the contract and register the demo vehicles again.

**Frontend cannot reach the backend**

- Ensure the backend is running on port 5000.
- Check the API URL configured in the frontend source.
- Confirm that CORS is enabled in the Express application.

**Dependencies or package errors**

- Run `npm install` separately in `blockchain`, `backend` and `frontend`.
- Follow the Node.js version requirements of the installed project dependencies.

## Security and Scope

This is an academic demonstration using a local development blockchain. It is not connected to a government vehicle-registration database and is not intended for production deployment.

The backend uses a local development signer supplied by Hardhat. Do not use development accounts, test private keys or this setup for real vehicle records or real funds.

The system hashes chassis and owner identifiers before storing them on-chain. Hashing does not automatically guarantee anonymity, and a hash is not encryption.

## License

This project is intended for educational and academic demonstration purposes.
