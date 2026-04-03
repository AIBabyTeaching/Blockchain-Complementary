import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

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

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getDeployment() {
  return readJson(path.join(labRoot, "blockchain", "deployments", "localhost.json"));
}

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

async function getSimpleStorageContract(withSigner = false) {
  const deployment = getDeployment();
  const artifact = getSimpleStorageArtifact();

  if (!deployment || !artifact) {
    return null;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  if (!withSigner) {
    return new ethers.Contract(deployment.contracts.SimpleStorage, artifact.abi, provider);
  }

  const signer = new ethers.Wallet(adminPrivateKey, provider);
  return new ethers.Contract(deployment.contracts.SimpleStorage, artifact.abi, signer);
}

app.get("/api/health", async (_req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const blockNumber = await provider.getBlockNumber();
    res.json({ ok: true, blockNumber, rpcUrl });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

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

app.get("/api/storage", async (_req, res) => {
  try {
    const contract = await getSimpleStorageContract(false);
    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contract not deployed yet. Run the deployer service after the chain starts."
      });
    }

    const [favoriteNumber, lessonMessage] = await contract.retrieve();
    const deployment = getDeployment();

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

app.post("/api/storage", async (req, res) => {
  const { favoriteNumber, lessonMessage } = req.body;

  if (!Number.isInteger(favoriteNumber) || typeof lessonMessage !== "string") {
    return res.status(400).json({
      ok: false,
      message: "favoriteNumber must be an integer and lessonMessage must be a string."
    });
  }

  try {
    const contract = await getSimpleStorageContract(true);
    if (!contract) {
      return res.status(404).json({
        ok: false,
        message: "Contract not deployed yet. Run the deployer service after the chain starts."
      });
    }

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

app.listen(port, () => {
  console.log(`Lab 1 API listening on port ${port}`);
});
