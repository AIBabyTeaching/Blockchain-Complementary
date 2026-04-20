import express from "express";
  // ^ Import Express, a lightweight HTTP server framework for Node.js.
import cors from "cors";
  // ^ Import CORS middleware. Allows the browser (different origin) to call this API.
import fs from "node:fs";
  // ^ Import Node.js file system module. We use it to read deployment and artifact files.
import path from "node:path";
  // ^ Import Node.js path module. We use it to build correct paths across OS platforms.
import { ethers } from "ethers";
  // ^ Import ethers.js, the library for reading and writing blockchain state.

// This API is the middle layer between the browser and the blockchain.
// The browser talks HTTP/JSON, but the blockchain speaks JSON-RPC and contract calls.
// So this file translates browser actions into blockchain reads and transactions.

const app = express();
  // ^ Create a new Express app instance. This becomes the HTTP server.
const port = Number(process.env.PORT || 3000);
  // ^ Get server port from environment variable, or use 3000 as fallback.
const labRoot = process.env.LAB_ROOT || "/workspace/labs/lab1";
  // ^ Get the base directory path for deployment and artifact files from environment.
const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  // ^ Get the Hardhat node JSON-RPC URL from environment. Default is localhost:8545.
const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || "";
  // ^ Get the wallet private key that will sign transactions. Empty string means read-only mode.

app.use(cors());
  // ^ Apply CORS middleware. Allows browsers on other origins to make requests to this API.
app.use(express.json());
  // ^ Apply JSON middleware. Automatically parses incoming request bodies as JSON.

const conceptCards = [
  // ^ Define static education content that the frontend will display.
  {
    // ^ First card about hashing.
    title: "Hashing",
    detail: "A tiny input change creates a very different output, which helps detect tampering."
  },
  {
    // ^ Second card about blocks.
    title: "Blocks",
    detail: "Each block keeps its own data and the hash of the previous block."
  },
  {
    // ^ Third card about shared state.
    title: "Shared state",
    detail: "Smart contracts keep trusted state that everyone can inspect on the same chain."
  }
];

// readJson() is a tiny utility for reading JSON files from disk.
// We use it for deployment metadata and contract artifact files.
function readJson(filePath) {
  // ^ Helper function. Takes a file path and returns parsed JSON or null.
  if (!fs.existsSync(filePath)) {
    // ^ Check if the file exists. If not, return null silently.
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
    // ^ Read file as UTF-8 text, parse as JSON, return parsed object.
}
// End readJson(): returns parsed JSON or null if the file does not exist.

// getDeployment() loads the saved contract addresses for the local network.
function getDeployment() {
  // ^ Helper function that reads the deployment metadata file.
  return readJson(path.join(labRoot, "blockchain", "deployments", "localhost.json"));
    // ^ Read labs/lab1/blockchain/deployments/localhost.json (full path constructed from labRoot).
}
// End getDeployment(): gives the API the current deployed addresses.

// getSimpleStorageArtifact() loads the compiled ABI for SimpleStorage.
// The ABI tells ethers how to encode function calls and decode returned values.
function getSimpleStorageArtifact() {
  // ^ Helper function that reads the compiled contract interface.
  return readJson(
    path.join(
      labRoot,
      "blockchain",
      "artifacts",
      "contracts",
      "SimpleStorage.sol",
      "SimpleStorage.json"
    )
      // ^ Construct path to labs/lab1/blockchain/artifacts/contracts/SimpleStorage.sol/SimpleStorage.json.
  );
}
// End getSimpleStorageArtifact(): returns the compiled contract interface.

// getSimpleStorageContract() builds a usable ethers Contract object.
// It also protects the lab from common viewing-time failures:
// missing deployment file, bad address, or address with no contract code on chain.
async function getSimpleStorageContract(withSigner = false) {
  // ^ Helper function that returns a ready-to-use contract instance (read-only or with signer).
  const deployment = getDeployment();
    // ^ Load the deployment metadata (contains contract addresses).
  const artifact = getSimpleStorageArtifact();
    // ^ Load the compiled contract's ABI (application binary interface).

  if (!deployment || !artifact || !deployment.contracts?.SimpleStorage) {
    // ^ Check if files loaded successfully and contain the expected data. Stop if any are missing.
    return {
      // ^ Return an error object instead of throwing. Lets API respond with proper HTTP status.
      ok: false,
        // ^ Flag indicating this attempt failed.
      status: 404,
        // ^ HTTP status: 404 (not found).
      message: "Contract metadata not found. Run the deployer service after the chain starts."
        // ^ User-friendly error message explaining how to fix this.
    };
  }

  const contractAddress = deployment.contracts.SimpleStorage;
    // ^ Extract the actual address where SimpleStorage is deployed (e.g. "0x5FbDB2...").
  if (!ethers.isAddress(contractAddress)) {
    // ^ Check if the address is valid format. Bad format = corrupted deployment file.
    return {
      ok: false,
      status: 500,
        // ^ HTTP status: 500 (server error).
      message: "Deployment file is invalid. Re-run deployer to regenerate addresses."
    };
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
    // ^ Create a connection to the Hardhat node at rpcUrl. This is read-only (no transactions).
  const code = await provider.getCode(contractAddress);
    // ^ Query the chain for bytecode at this address. Response is hex string or "0x" (empty).
  if (!code || code === "0x") {
    // ^ If no code at the address, the contract was never deployed (or chain was reset).
    return {
      ok: false,
      status: 409,
        // ^ HTTP status: 409 (conflict). The request is valid but conflicts with current chain state.
      message:
        // ^ Multi-line error message explaining that deployer must be run first.
        "SimpleStorage is not deployed on the current chain state. Run: docker compose run --rm deployer"
    };
  }

  if (!withSigner) {
    // ^ If read-only mode requested, create contract with just the provider (no signing capability).
    return {
      ok: true,
        // ^ Flag indicating success.
      contract: new ethers.Contract(contractAddress, artifact.abi, provider),
        // ^ Create the contract instance using the address, ABI, and provider.
      deployment
        // ^ Include deployment metadata so caller can also get the address.
    };
  }

  const signer = new ethers.Wallet(adminPrivateKey, provider);
    // ^ Create a wallet instance from the private key. This can sign transactions.
  return {
    ok: true,
    contract: new ethers.Contract(contractAddress, artifact.abi, signer),
      // ^ Create the contract instance with signer, so transactions can be uploaded to the chain.
    deployment
  };
}
// End getSimpleStorageContract(): returns either a safe error object or a ready-to-use contract.

// Health endpoint: proves the API can reach the local blockchain node.
// It does not touch the contract yet; it only asks the chain for the latest block number.
app.get("/api/health", async (_req, res) => {
  // ^ GET endpoint. Called when someone navigates to http://localhost:3000/api/health.
  try {
    // ^ Wrap in try/catch so errors return JSON instead of crashing the server.
    const provider = new ethers.JsonRpcProvider(rpcUrl);
      // ^ Create a provider connection to Hardhat.
    const blockNumber = await provider.getBlockNumber();
      // ^ Query the latest block number to confirm the chain is alive.
    res.json({ ok: true, blockNumber, rpcUrl });
      // ^ Return JSON with success flag and the current block number.
  } catch (error) {
    // ^ If anything fails (chain offline, network error, etc), catch and respond.
    res.status(500).json({ ok: false, message: error.message });
      // ^ Return 500 error with the error message.
  }
});
// End /api/health: browser can use this to show whether the chain is alive.

// Foundation endpoint: serves static viewing content for the concept cards.
app.get("/api/foundation", (_req, res) => {
  // ^ GET endpoint. Returns non-blockchain content (education cards, course outline).
  res.json({
    // ^ Return JSON object with all foundation data.
    title: "Lab 1: blockchain foundations repaired quickly",
      // ^ Course title.
    cards: conceptCards,
      // ^ Return the education cards defined earlier.
    nextLabs: [
      // ^ Array of next course modules.
      "Local node and accounts",
      "Deploy SimpleStorage",
      "Build certificate registry",
      "Access control and tests"
    ]
  });
});
// End /api/foundation: provides UI content unrelated to contract state.

// Read endpoint: fetches current on-chain values from SimpleStorage.
// This is a contract call, not a transaction, because it does not modify state.
app.get("/api/storage", async (_req, res) => {
  // ^ GET endpoint. Called when frontend wants to read current contract state.
  try {
    const contractResult = await getSimpleStorageContract(false);
      // ^ Load the contract (read-only mode, false = no signer needed).
    if (!contractResult.ok) {
      // ^ If contract loading failed, return the error to the browser.
      return res.status(contractResult.status).json({
        ok: false,
        message: contractResult.message
      });
        // ^ Use the .ok and .status from the error object, send back to frontend.
    }

    const { contract, deployment } = contractResult;
      // ^ Destructure the successful result: extract contract and deployment metadata.
    const [favoriteNumber, lessonMessage] = await contract.retrieve();
      // ^ Call the retrieve() function on the contract. This reads state from the chain.
      // ^ Destructure the two returned values into favoriteNumber and lessonMessage.

    res.json({
      // ^ Return the values to the frontend.
      ok: true,
      favoriteNumber: Number(favoriteNumber),
        // ^ Convert BigNumber to regular JavaScript number.
      lessonMessage,
        // ^ The message string as-is.
      contractAddress: deployment.contracts.SimpleStorage
        // ^ Also send back the contract address so the frontend can display it.
    });
  } catch (error) {
    // ^ If anything goes wrong (chain error, parsing error, etc), catch it.
    res.status(500).json({ ok: false, message: error.message });
      // ^ Return 500 error with the error message.
  }
});
// End GET /api/storage: returns current favorite number, message, and contract address.

// Write endpoint: updates contract state.
// This path creates a transaction, waits for mining, then reads the new state back.
app.post("/api/storage", async (req, res) => {
  // ^ POST endpoint. Called when frontend submits a new number and message.
  const { favoriteNumber, lessonMessage } = req.body;
    // ^ Extract the values from the JSON request body.

  if (!Number.isInteger(favoriteNumber) || typeof lessonMessage !== "string") {
    // ^ Validate inputs before sending to blockchain (saves gas on failed transactions).
    return res.status(400).json({
      ok: false,
      message: "favoriteNumber must be an integer and lessonMessage must be a string."
        // ^ Return 400 (bad request) if inputs don't match expected types.
    });
  }

  try {
    const contractResult = await getSimpleStorageContract(true);
      // ^ Load the contract WITH signer (true = include signing capability for transactions).
    if (!contractResult.ok) {
      // ^ If contract loading failed, return the error.
      return res.status(contractResult.status).json({
        ok: false,
        message: contractResult.message
      });
    }

    const { contract } = contractResult;
      // ^ Destructure just the contract from the result.
    const tx = await contract.store(favoriteNumber, lessonMessage);
      // ^ Call the store() function on the contract. This sends a transaction to the chain.
      // ^ tx is the transaction object (not yet mined).
    await tx.wait();
      // ^ WAIT for the transaction to be included in a block and mined. This can take 12 seconds locally.
    const [storedNumber, storedMessage] = await contract.retrieve();
      // ^ Read the state back from the chain to confirm the write succeeded.

    res.json({
      // ^ Return success to the frontend.
      ok: true,
      txHash: tx.hash,
        // ^ The transaction hash (like "0x123abc..."). Frontend shows this to prove the transaction happened.
      favoriteNumber: Number(storedNumber),
        // ^ The newly stored number (read back from chain).
      lessonMessage: storedMessage
        // ^ The newly stored message (read back from chain).
    });
  } catch (error) {
    // ^ If transaction fails (out of gas, validation error, etc), catch it.
    res.status(500).json({ ok: false, message: error.message });
      // ^ Return 500 error with the error message.
  }
});
// End POST /api/storage: returns tx hash and updated stored values.

// Start the HTTP server so the frontend can call these endpoints.
app.listen(port, () => {
  // ^ Start listening for incoming HTTP requests on the specified port.
  console.log(`Lab 1 API listening on port ${port}`);
    // ^ Print to terminal so the user knows the server is running.
});
// End server startup.
