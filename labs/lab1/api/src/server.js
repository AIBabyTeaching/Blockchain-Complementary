import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

// This API is the middle layer between the browser and the blockchain.
// The browser talks HTTP/JSON, but the blockchain speaks JSON-RPC and contract calls.
// So this file translates browser actions into blockchain reads and transactions.

const app = express();
const port = Number(process.env.PORT || 3000);
const labRoot = process.env.LAB_ROOT || "/workspace/labs/lab1";
const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || "";

app.use(cors());
app.use(express.json());

const conceptCards = [
  {
    title: "Hashing",
    detail: "A tiny input change creates a very different output, which helps detect tampering."
  },
  {
    title: "Blocks",
    detail: "Each block keeps its own data and the hash of the previous block."
  },
  {
    title: "Shared state",
    detail: "Smart contracts keep trusted state that everyone can inspect on the same chain."
  }
];

// readJson() is a tiny utility for reading JSON files from disk.
// We use it for deployment metadata and contract artifact files.
function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
// End readJson(): returns parsed JSON or null if the file does not exist.

// getDeployment() loads the saved contract addresses for the local network.
function getDeployment() {
  return readJson(path.join(labRoot, "blockchain", "deployments", "localhost.json"));
}
// End getDeployment(): gives the API the current deployed addresses.

// getSimpleStorageArtifact() loads the compiled ABI for SimpleStorage.
// The ABI tells ethers how to encode function calls and decode returned values.
function getSimpleStorageArtifact() {
  return readJson(
    path.join(
      labRoot,
      "blockchain",
      "artifacts",
      "contracts",
      "SimpleStorage.sol",
      "SimpleStorage.json"
    )
  );
}
// End getSimpleStorageArtifact(): returns the compiled contract interface.

// getSimpleStorageContract() builds a usable ethers Contract object.
// It also protects the lab from common viewing-time failures:
// missing deployment file, bad address, or address with no contract code on chain.
async function getSimpleStorageContract(withSigner = false) {
  const deployment = getDeployment();
  const artifact = getSimpleStorageArtifact();

  if (!deployment || !artifact || !deployment.contracts?.SimpleStorage) {
    return {
      ok: false,
      status: 404,
      message: "Contract metadata not found. Run the deployer service after the chain starts."
    };
  }

  const contractAddress = deployment.contracts.SimpleStorage;
  if (!ethers.isAddress(contractAddress)) {
    return {
      ok: false,
      status: 500,
      message: "Deployment file is invalid. Re-run deployer to regenerate addresses."
    };
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const code = await provider.getCode(contractAddress);
  if (!code || code === "0x") {
    return {
      ok: false,
      status: 409,
      message:
        "SimpleStorage is not deployed on the current chain state. Run: docker compose run --rm deployer"
    };
  }

  if (!withSigner) {
    return {
      ok: true,
      contract: new ethers.Contract(contractAddress, artifact.abi, provider),
      deployment
    };
  }

  const signer = new ethers.Wallet(adminPrivateKey, provider);
  return {
    ok: true,
    contract: new ethers.Contract(contractAddress, artifact.abi, signer),
    deployment
  };
}
// End getSimpleStorageContract(): returns either a safe error object or a ready-to-use contract.

// Health endpoint: proves the API can reach the local blockchain node.
// It does not touch the contract yet; it only asks the chain for the latest block number.
app.get("/api/health", async (_req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const blockNumber = await provider.getBlockNumber();
    res.json({ ok: true, blockNumber, rpcUrl });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});
// End /api/health: browser can use this to show whether the chain is alive.

// Foundation endpoint: serves static viewing content for the concept cards.
app.get("/api/foundation", (_req, res) => {
  res.json({
    title: "Lab 1: blockchain foundations repaired quickly",
    cards: conceptCards,
    nextLabs: [
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
  try {
    const contractResult = await getSimpleStorageContract(false);
    if (!contractResult.ok) {
      return res.status(contractResult.status).json({
        ok: false,
        message: contractResult.message
      });
    }

    const { contract, deployment } = contractResult;
    const [favoriteNumber, lessonMessage] = await contract.retrieve();

    res.json({
      ok: true,
      favoriteNumber: Number(favoriteNumber),
      lessonMessage,
      contractAddress: deployment.contracts.SimpleStorage
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});
// End GET /api/storage: returns current favorite number, message, and contract address.

// Write endpoint: updates contract state.
// This path creates a transaction, waits for mining, then reads the new state back.
app.post("/api/storage", async (req, res) => {
  const { favoriteNumber, lessonMessage } = req.body;

  if (!Number.isInteger(favoriteNumber) || typeof lessonMessage !== "string") {
    return res.status(400).json({
      ok: false,
      message: "favoriteNumber must be an integer and lessonMessage must be a string."
    });
  }

  try {
    const contractResult = await getSimpleStorageContract(true);
    if (!contractResult.ok) {
      return res.status(contractResult.status).json({
        ok: false,
        message: contractResult.message
      });
    }

    const { contract } = contractResult;
    const tx = await contract.store(favoriteNumber, lessonMessage);
    await tx.wait();
    const [storedNumber, storedMessage] = await contract.retrieve();

    res.json({
      ok: true,
      txHash: tx.hash,
      favoriteNumber: Number(storedNumber),
      lessonMessage: storedMessage
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});
// End POST /api/storage: returns tx hash and updated stored values.

// Start the HTTP server so the frontend can call these endpoints.
app.listen(port, () => {
  console.log(`Lab 1 API listening on port ${port}`);
});
// End server startup.
