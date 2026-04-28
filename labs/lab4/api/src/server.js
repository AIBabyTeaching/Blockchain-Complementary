import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

// -----------------------------------------------------------------------------
// Lab 4 API Structure
// -----------------------------------------------------------------------------
// 1. Static teaching data:
//    - localProfiles labels Hardhat accounts for the UI.
//    - proofMechanisms powers the proof table and proof-mode simulator.
//    - conceptCards, registryStages, and registryRules feed classroom panels.
//
// 2. Blockchain helpers:
//    - buildProvider connects to Hardhat JSON-RPC.
//    - getDeployment/getRegistryArtifact load deploy metadata and ABI.
//    - getRegistryContract creates read-only or signer-connected contracts.
//
// 3. Data builders:
//    - getRegistrySummary reads contract counters.
//    - getCertificateDetails normalizes verification results.
//    - getCertificateHistory reads issued/revoked events.
//
// 4. HTTP endpoints:
//    - /api/health, /api/foundation, /api/accounts, /api/registry.
//    - /api/certificates/history.
//    - /api/certificates/issue, /verify, /revoke.
//
// 5. Teaching boundary:
//    - Real state changes happen on the Hardhat chain.
//    - Proof modes are educational simulations, not live consensus engines.
// -----------------------------------------------------------------------------

const app = express();
const port = Number(process.env.PORT || 3003);
const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
const labRoot = process.env.LAB_ROOT || "/workspace/labs/lab4";

app.use(cors());
app.use(express.json());

// These labels turn the unlocked Hardhat accounts into classroom roles.
// Account 1 is expected to be the contract deployer, so it becomes the issuer.
const localProfiles = [
  { label: "Account 1", role: "Certificate issuer" },
  { label: "Account 2", role: "Registrar candidate" },
  { label: "Account 3", role: "Student viewer" },
  { label: "Account 4", role: "Employer verifier" }
];

// Data used by the frontend proof table and proof-mode simulator.
// This is a teaching simulation only; Hardhat is still the actual local chain.
const proofMechanisms = [
  {
    mechanism: "PoW",
    resourceUsed: "Compute",
    energyProfile: "Very High",
    decentralization: "High",
    securityModel: "Hash difficulty",
    labUse: "A miner would spend compute to place the issue or revoke transaction into a block.",
    simulationActor: "Miner",
    simulationRisk: "Attackers must control enough compute power to rewrite or dominate block production.",
    simulationSteps: [
      "The certificate transaction enters the pending transaction pool.",
      "Miners compete by hashing block candidates until one satisfies the difficulty target.",
      "The winning miner publishes the block that contains the issue or revoke transaction.",
      "Other nodes verify the work, then the CertificateRegistry contract rules remain the final application check."
    ]
  },
  {
    mechanism: "PoS",
    resourceUsed: "Capital (stake)",
    energyProfile: "Low",
    decentralization: "High",
    securityModel: "Economic penalties",
    labUse: "A validator with locked stake would include the registry transaction and risk penalties for dishonest behavior.",
    simulationActor: "Staked validator",
    simulationRisk: "Dishonest validators can lose locked stake, so cheating becomes economically expensive.",
    simulationSteps: [
      "The certificate transaction waits for a validator proposal slot.",
      "A staked validator proposes a block containing the registry transaction.",
      "Other validators attest that the block is valid.",
      "If the validator cheats, economic penalties protect the chain while the contract still enforces issuer rules."
    ]
  },
  {
    mechanism: "PoA",
    resourceUsed: "Identity",
    energyProfile: "Very Low",
    decentralization: "Low",
    securityModel: "Trusted validators",
    labUse: "Known institutions, such as an academy or ministry, could act as validators for a private certificate chain.",
    simulationActor: "Known authority validator",
    simulationRisk: "Security depends on trusted validator identities and governance, not open competition.",
    simulationSteps: [
      "The certificate transaction is submitted to a private or consortium chain.",
      "A known authority, such as an academy or ministry validator, produces the next block.",
      "The block records the registry transaction quickly with very low energy use.",
      "This is practical for institutions, but users must trust the validator set."
    ]
  },
  {
    mechanism: "PoC",
    resourceUsed: "Storage",
    energyProfile: "Low",
    decentralization: "Medium",
    securityModel: "Disk commitment",
    labUse: "Validators would prove storage commitment before helping order certificate registry transactions.",
    simulationActor: "Storage committer",
    simulationRisk: "Participants must prove committed disk capacity instead of spending compute or locking stake.",
    simulationSteps: [
      "Participants prepare disk space commitments before block production.",
      "The network selects or favors a participant based on valid storage proofs.",
      "The selected participant includes the registry transaction in a block.",
      "The certificate contract still decides whether the issuer can write the certificate status."
    ]
  },
  {
    mechanism: "PoH",
    resourceUsed: "Time (hash chain)",
    energyProfile: "Low",
    decentralization: "High (with PoS)",
    securityModel: "Verifiable ordering",
    labUse: "Use the event history to explain ordering: the issue event must appear before the revoke event.",
    simulationActor: "Ordering clock plus validators",
    simulationRisk: "The hash chain proves event order, but validator security is still needed around it.",
    simulationSteps: [
      "A continuous hash chain creates a verifiable time order for transactions.",
      "The issue or revoke transaction is placed into that ordered stream.",
      "Validators use the ordering record to agree on what happened first.",
      "Use Lab 4 history to show that a certificate must be issued before revocation makes sense."
    ]
  },
  {
    mechanism: "PoI",
    resourceUsed: "Activity + Stake",
    energyProfile: "Low",
    decentralization: "Medium",
    securityModel: "Behavioral scoring",
    labUse: "Active trusted participants could gain influence based on stake plus useful network activity.",
    simulationActor: "High-importance participant",
    simulationRisk: "Influence is based on a score, so poor scoring design can bias who gets block power.",
    simulationSteps: [
      "Participants receive importance scores from stake plus useful network activity.",
      "A high-importance participant is favored to help produce or approve a block.",
      "The certificate transaction is included by a participant with meaningful network activity.",
      "This lets you discuss whether active institutions should receive more influence."
    ]
  },
  {
    mechanism: "PoCo",
    resourceUsed: "Useful work",
    energyProfile: "Low",
    decentralization: "Medium",
    securityModel: "Contribution validation",
    labUse: "Validators would be rewarded for useful contribution, not arbitrary computation.",
    simulationActor: "Useful-work contributor",
    simulationRisk: "The network must reliably validate that the claimed useful work was actually performed.",
    simulationSteps: [
      "Participants submit useful contributions instead of arbitrary mining work.",
      "The network validates the contribution before rewarding or selecting the participant.",
      "A valid contributor helps include the certificate registry transaction in a block.",
      "Use this to discuss useful validation work versus pure compute waste."
    ]
  },
  {
    mechanism: "PoR",
    resourceUsed: "Reputation",
    energyProfile: "Low",
    decentralization: "Medium-Low",
    securityModel: "Trust history",
    labUse: "Accredited organizations with strong trust history could be preferred as validators.",
    simulationActor: "Reputation-weighted validator",
    simulationRisk: "Security depends on reputation records, so new participants may have less power.",
    simulationSteps: [
      "Organizations build trust history over time.",
      "High-reputation validators are preferred to produce or approve blocks.",
      "The certificate registry transaction is ordered by a trusted participant.",
      "This maps naturally to accredited universities, ministries, or certification authorities."
    ]
  }
];

// Short concept cards shown near the top of the frontend.
// Keep these concise because they are read while the instructor is explaining.
const conceptCards = [
  {
    title: "Certificate Hash",
    detail: "The registry stores a bytes32 fingerprint of certificate data. Verification starts by recomputing or presenting that hash."
  },
  {
    title: "Issuer Rule",
    detail: "Only the deployer account can issue or revoke certificates. Verification remains public and read-only."
  },
  {
    title: "Events as Audit Trail",
    detail: "CertificateIssued and CertificateRevoked events give the frontend a readable history of registry activity."
  },
  {
    title: "Proof Mechanisms",
    detail: "Consensus mechanisms decide who can order blocks. The certificate contract decides what state changes are valid."
  }
];

// Step list for the visible "rules and stages" section in the UI.
const registryStages = [
  "The browser prepares certificate fields or a certificate hash.",
  "The API validates the request and loads the deployed CertificateRegistry contract.",
  "The issuer account signs issue or revoke transactions.",
  "The Hardhat node mines the contract call into a block.",
  "The frontend refreshes registry counts, certificate status, and event history."
];

// High-level rules YOU should observe while using the lab.
const registryRules = [
  "Only the issuer can add a new certificate hash.",
  "The same certificate hash cannot be issued twice.",
  "Anyone can verify a hash without sending a transaction.",
  "A revoked certificate still exists, but it is no longer valid.",
  "Proof mechanisms explain block agreement; contract rules explain application validity."
];

// Build a JSON-RPC provider for the local Hardhat chain.
// All contract reads and transactions pass through this provider.
function buildProvider() {
  return new ethers.JsonRpcProvider(rpcUrl);
}

// Read optional JSON files such as deployment metadata or contract artifacts.
// Returning null lets endpoints produce friendly "deploy first" messages.
function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Load the deployed address and sample certificate written by the deployer.
function getDeployment() {
  return readJson(path.join(labRoot, "blockchain", "deployments", "localhost.json"));
}

// Load the compiled ABI so ethers can call CertificateRegistry functions.
function getRegistryArtifact() {
  return readJson(
    path.join(
      labRoot,
      "blockchain",
      "artifacts",
      "contracts",
      "CertificateRegistry.sol",
      "CertificateRegistry.json"
    )
  );
}

// Convert nested ethers/JSON-RPC errors into one readable API message.
function normalizeError(error) {
  return (
    error?.shortMessage ||
    error?.info?.error?.message ||
    error?.reason ||
    error?.message ||
    "Unknown error."
  );
}

// Convert wei balances into a fixed ETH display for frontend cards.
function formatEth(value) {
  return Number(ethers.formatEther(value)).toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}

// Match the contract's hash formula so the API and Solidity agree on the
// exact certificate fingerprint for the same field values.
function computeCertificateHash({ studentId, studentName, courseName, grade }) {
  return ethers.keccak256(
    ethers.toUtf8Bytes([studentId, studentName, courseName, grade].join("|"))
  );
}

// Validate a required text field and return the trimmed value.
function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

// Extract and validate the certificate fields sent by the frontend issue form.
function parseCertificateInput(body) {
  return {
    studentId: requireText(body.studentId, "studentId"),
    studentName: requireText(body.studentName, "studentName"),
    courseName: requireText(body.courseName, "courseName"),
    grade: requireText(body.grade, "grade")
  };
}

// Ensure a submitted hash is exactly a bytes32 hex string before calling the contract.
function validateCertificateHash(certificateHash) {
  if (typeof certificateHash !== "string" || !ethers.isHexString(certificateHash, 32)) {
    throw new Error("certificateHash must be a 32-byte hex string.");
  }

  return certificateHash;
}

// Read the freshest block number directly from JSON-RPC.
// This avoids stale block data when the UI refreshes quickly after a transaction.
async function getFreshBlockNumber(provider) {
  const blockHex = await provider.send("eth_blockNumber", []);
  return Number(BigInt(blockHex));
}

// Build the classroom account catalog from Hardhat's unlocked accounts.
// Each entry keeps a signer so the API can submit issue/revoke transactions.
async function buildAccountCatalog(provider) {
  const addresses = await provider.send("eth_accounts", []);
  const entries = await Promise.all(
    localProfiles.map(async (profile, index) => {
      const address = addresses[index];
      if (!address) {
        return null;
      }

      return {
        ...profile,
        address,
        signer: await provider.getSigner(address)
      };
    })
  );

  return entries.filter(Boolean);
}

// Find a catalog entry by address, case-insensitively.
function findAccount(catalog, address) {
  return catalog.find((entry) => entry.address.toLowerCase() === String(address).toLowerCase());
}

// Create a CertificateRegistry contract instance.
// Without a signer it is read-only; with a signer address it can send transactions.
async function getRegistryContract(withSignerAddress = "") {
  const deployment = getDeployment();
  const artifact = getRegistryArtifact();

  if (!deployment || !artifact || !deployment.contracts?.CertificateRegistry) {
    return {
      ok: false,
      status: 404,
      message: "Lab 4 contract metadata is missing. Run: docker compose run --rm lab4-deployer"
    };
  }

  const contractAddress = deployment.contracts.CertificateRegistry;
  if (!ethers.isAddress(contractAddress)) {
    return {
      ok: false,
      status: 500,
      message: "Lab 4 deployment file is invalid. Re-run the Lab 4 deployer."
    };
  }

  const provider = buildProvider();
  const code = await provider.getCode(contractAddress);
  if (!code || code === "0x") {
    return {
      ok: false,
      status: 409,
      message: "CertificateRegistry is not deployed on the current chain state. Run: docker compose run --rm lab4-deployer"
    };
  }

  if (!withSignerAddress) {
    return {
      ok: true,
      provider,
      deployment,
      contract: new ethers.Contract(contractAddress, artifact.abi, provider)
    };
  }

  const catalog = await buildAccountCatalog(provider);
  const account = findAccount(catalog, withSignerAddress);
  if (!account) {
    return {
      ok: false,
      status: 404,
      message: "Use one of the listed local Hardhat accounts."
    };
  }

  return {
    ok: true,
    provider,
    deployment,
    account,
    contract: new ethers.Contract(contractAddress, artifact.abi, account.signer)
  };
}

// Return a compact block summary for frontend "what changed" panels.
async function getLatestBlockSummary(provider, blockNumber = null) {
  const resolvedBlockNumber =
    blockNumber === null ? await getFreshBlockNumber(provider) : blockNumber;
  const block = await provider.getBlock(resolvedBlockNumber);

  return {
    blockNumber: resolvedBlockNumber,
    timestampIso: block ? new Date(Number(block.timestamp) * 1000).toISOString() : null,
    transactionCount: block ? block.transactions.length : 0
  };
}

// Return balances, nonces, labels, and issuer status for the visible account cards.
async function getAccountsSnapshot(provider, registryIssuer = "") {
  const catalog = await buildAccountCatalog(provider);
  const blockTag = await getFreshBlockNumber(provider);

  return Promise.all(
    catalog.map(async (entry) => {
      const [balanceWei, nonce] = await Promise.all([
        provider.getBalance(entry.address, blockTag),
        provider.getTransactionCount(entry.address, blockTag)
      ]);

      return {
        label: entry.label,
        role: entry.role,
        address: entry.address,
        balanceEth: formatEth(balanceWei),
        nonce,
        isIssuer:
          Boolean(registryIssuer) &&
          entry.address.toLowerCase() === registryIssuer.toLowerCase()
      };
    })
  );
}

// Read the main registry counters and metadata from the deployed contract.
async function getRegistrySummary(contract, deployment) {
  const [issuer, certificateCount, revokedCount] = await Promise.all([
    contract.issuer(),
    contract.certificateCount(),
    contract.revokedCount()
  ]);

  return {
    contractAddress: deployment.contracts.CertificateRegistry,
    issuer,
    certificateCount: Number(certificateCount),
    revokedCount: Number(revokedCount),
    activeCount: Number(certificateCount) - Number(revokedCount),
    sampleCertificate: deployment.sampleCertificate || null
  };
}

// Read one certificate's verification status and, if it exists, its stored fields.
// This keeps "not found" as a normal result instead of a thrown contract error.
async function getCertificateDetails(contract, certificateHash) {
  const verification = await contract.verifyCertificate(certificateHash);

  const base = {
    certificateHash,
    exists: verification[0],
    valid: verification[1],
    revoked: verification[2],
    issuedAt: Number(verification[3]),
    revokedAt: Number(verification[4]),
    issuedAtIso: Number(verification[3])
      ? new Date(Number(verification[3]) * 1000).toISOString()
      : null,
    revokedAtIso: Number(verification[4])
      ? new Date(Number(verification[4]) * 1000).toISOString()
      : null
  };

  if (!base.exists) {
    return base;
  }

  const certificate = await contract.getCertificate(certificateHash);
  return {
    ...base,
    studentId: certificate[0],
    studentName: certificate[1],
    courseName: certificate[2],
    grade: certificate[3]
  };
}

// Reconstruct recent activity from CertificateIssued and CertificateRevoked events.
// The frontend uses this as the audit trail panel.
async function getCertificateHistory(contract, deployment, provider) {
  const fromBlock = deployment.deployedBlock || 0;
  const [issuedEvents, revokedEvents] = await Promise.all([
    contract.queryFilter(contract.filters.CertificateIssued(), fromBlock),
    contract.queryFilter(contract.filters.CertificateRevoked(), fromBlock)
  ]);

  const issued = issuedEvents.map((event) => ({
    type: "issued",
    certificateHash: event.args.certificateHash,
    studentId: event.args.studentId,
    studentName: event.args.studentName,
    courseName: event.args.courseName,
    issuer: event.args.issuer,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
    order: event.index || 0
  }));

  const revoked = revokedEvents.map((event) => ({
    type: "revoked",
    certificateHash: event.args.certificateHash,
    reason: event.args.reason,
    issuer: event.args.issuer,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
    order: event.index || 0
  }));

  const events = issued
    .concat(revoked)
    .sort((left, right) => {
      if (right.blockNumber !== left.blockNumber) {
        return right.blockNumber - left.blockNumber;
      }

      return right.order - left.order;
    })
    .slice(0, 12);

  return Promise.all(
    events.map(async (event) => {
      const block = await provider.getBlock(event.blockNumber);
      return {
        ...event,
        timestampIso: block ? new Date(Number(block.timestamp) * 1000).toISOString() : null
      };
    })
  );
}

// Enforce the issuer rule in the API before attempting an issuer-only contract call.
// The contract also enforces this; the API check gives YOU a clearer error.
async function requireIssuerAccount(contract, account) {
  const issuer = await contract.issuer();
  if (issuer.toLowerCase() !== account.address.toLowerCase()) {
    return {
      ok: false,
      status: 403,
      message: "Only the registry issuer account can issue or revoke certificates."
    };
  }

  return { ok: true, issuer };
}

// Health endpoint: proves the API can reach the chain and sees deployment metadata.
app.get("/api/health", async (_req, res) => {
  try {
    const provider = buildProvider();
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      getFreshBlockNumber(provider)
    ]);

    res.json({
      ok: true,
      rpcUrl,
      chainId: Number(network.chainId),
      blockNumber,
      contractDeploymentFound: Boolean(getDeployment()?.contracts?.CertificateRegistry)
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: normalizeError(error) });
  }
});

// Foundation endpoint: static teaching content consumed by the frontend.
app.get("/api/foundation", (_req, res) => {
  res.json({
    ok: true,
    title: "Lab 4: certificate registry and proof mechanisms",
    objectives: [
      "Deploy a registry-style smart contract to the local chain.",
      "Issue a certificate hash from the trusted issuer account.",
      "Verify an issued hash without sending a transaction.",
      "Revoke a certificate and explain the difference between exists and valid.",
      "Compare PoW, PoS, PoA, PoC, PoH, PoI, PoCo, and PoR."
    ],
    cards: conceptCards,
    stages: registryStages,
    registryRules,
    proofMechanisms
  });
});

// Accounts endpoint: local Hardhat accounts with balances, nonces, and issuer marker.
app.get("/api/accounts", async (_req, res) => {
  try {
    const provider = buildProvider();
    const contractResult = await getRegistryContract();
    let issuer = "";
    if (contractResult.ok) {
      issuer = await contractResult.contract.issuer();
    }

    const accounts = await getAccountsSnapshot(provider, issuer);

    res.json({
      ok: true,
      deploymentReady: contractResult.ok,
      accounts
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: normalizeError(error) });
  }
});

// Registry endpoint: current contract address, issuer, counts, and sample certificate.
app.get("/api/registry", async (_req, res) => {
  try {
    const contractResult = await getRegistryContract();
    if (!contractResult.ok) {
      return res.status(contractResult.status).json({
        ok: false,
        message: contractResult.message
      });
    }

    const [registry, latestBlock] = await Promise.all([
      getRegistrySummary(contractResult.contract, contractResult.deployment),
      getLatestBlockSummary(contractResult.provider)
    ]);

    res.json({
      ok: true,
      registry,
      latestBlock
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: normalizeError(error) });
  }
});

// History endpoint: recent issue/revoke events, sorted newest first.
app.get("/api/certificates/history", async (_req, res) => {
  try {
    const contractResult = await getRegistryContract();
    if (!contractResult.ok) {
      return res.status(contractResult.status).json({
        ok: false,
        message: contractResult.message
      });
    }

    const history = await getCertificateHistory(
      contractResult.contract,
      contractResult.deployment,
      contractResult.provider
    );

    res.json({ ok: true, history });
  } catch (error) {
    res.status(500).json({ ok: false, message: normalizeError(error) });
  }
});

// Verify endpoint: read-only lookup by certificate hash.
// This does not send a blockchain transaction and does not change nonce.
app.post("/api/certificates/verify", async (req, res) => {
  try {
    const certificateHash = validateCertificateHash(req.body.certificateHash);
    const contractResult = await getRegistryContract();
    if (!contractResult.ok) {
      return res.status(contractResult.status).json({
        ok: false,
        message: contractResult.message
      });
    }

    const [certificate, latestBlock] = await Promise.all([
      getCertificateDetails(contractResult.contract, certificateHash),
      getLatestBlockSummary(contractResult.provider)
    ]);

    res.json({
      ok: true,
      certificate,
      latestBlock
    });
  } catch (error) {
    res.status(400).json({ ok: false, message: normalizeError(error) });
  }
});

// Issue endpoint: state-changing transaction that stores a new certificate hash.
// Only the issuer account is allowed to perform this workflow.
app.post("/api/certificates/issue", async (req, res) => {
  try {
    const issuerAddress = requireText(req.body.issuerAddress, "issuerAddress");
    const certificateInput = parseCertificateInput(req.body);
    const certificateHash = computeCertificateHash(certificateInput);

    const contractResult = await getRegistryContract(issuerAddress);
    if (!contractResult.ok) {
      return res.status(contractResult.status).json({
        ok: false,
        message: contractResult.message
      });
    }

    const { provider, contract, deployment, account } = contractResult;
    const issuerCheck = await requireIssuerAccount(contract, account);
    if (!issuerCheck.ok) {
      return res.status(issuerCheck.status).json({
        ok: false,
        message: issuerCheck.message
      });
    }

    const beforeBlockTag = await getFreshBlockNumber(provider);
    const [balanceBefore, nonceBefore, registryBefore, verificationBefore] = await Promise.all([
      provider.getBalance(account.address, beforeBlockTag),
      provider.getTransactionCount(account.address, beforeBlockTag),
      getRegistrySummary(contract, deployment),
      contract.verifyCertificate(certificateHash)
    ]);

    if (verificationBefore[0]) {
      return res.status(400).json({
        ok: false,
        message: "This certificate hash already exists in the registry."
      });
    }

    const tx = await contract.issueCertificate(
      certificateHash,
      certificateInput.studentId,
      certificateInput.studentName,
      certificateInput.courseName,
      certificateInput.grade
    );
    const receipt = await tx.wait();

    const [balanceAfter, nonceAfter, registry, certificate, latestBlock] = await Promise.all([
      provider.getBalance(account.address, receipt.blockNumber),
      provider.getTransactionCount(account.address, receipt.blockNumber),
      getRegistrySummary(contract, deployment),
      getCertificateDetails(contract, certificateHash),
      getLatestBlockSummary(provider, receipt.blockNumber)
    ]);

    res.json({
      ok: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      certificate,
      registryBefore,
      registry,
      issuer: {
        label: account.label,
        role: account.role,
        address: account.address,
        balanceBeforeEth: formatEth(balanceBefore),
        balanceAfterEth: formatEth(balanceAfter),
        nonceBefore,
        nonceAfter
      },
      latestBlock
    });
  } catch (error) {
    res.status(400).json({ ok: false, message: normalizeError(error) });
  }
});

// Revoke endpoint: state-changing transaction that marks an existing hash invalid.
// The certificate remains in storage so the audit history is preserved.
app.post("/api/certificates/revoke", async (req, res) => {
  try {
    const issuerAddress = requireText(req.body.issuerAddress, "issuerAddress");
    const certificateHash = validateCertificateHash(req.body.certificateHash);
    const reason = requireText(req.body.reason, "reason");

    const contractResult = await getRegistryContract(issuerAddress);
    if (!contractResult.ok) {
      return res.status(contractResult.status).json({
        ok: false,
        message: contractResult.message
      });
    }

    const { provider, contract, deployment, account } = contractResult;
    const issuerCheck = await requireIssuerAccount(contract, account);
    if (!issuerCheck.ok) {
      return res.status(issuerCheck.status).json({
        ok: false,
        message: issuerCheck.message
      });
    }

    const certificateBefore = await getCertificateDetails(contract, certificateHash);
    if (!certificateBefore.exists) {
      return res.status(404).json({
        ok: false,
        message: "Certificate hash is not in the registry."
      });
    }

    if (certificateBefore.revoked) {
      return res.status(400).json({
        ok: false,
        message: "Certificate is already revoked."
      });
    }

    const beforeBlockTag = await getFreshBlockNumber(provider);
    const [balanceBefore, nonceBefore, registryBefore] = await Promise.all([
      provider.getBalance(account.address, beforeBlockTag),
      provider.getTransactionCount(account.address, beforeBlockTag),
      getRegistrySummary(contract, deployment)
    ]);

    const tx = await contract.revokeCertificate(certificateHash, reason);
    const receipt = await tx.wait();

    const [balanceAfter, nonceAfter, registry, certificate, latestBlock] = await Promise.all([
      provider.getBalance(account.address, receipt.blockNumber),
      provider.getTransactionCount(account.address, receipt.blockNumber),
      getRegistrySummary(contract, deployment),
      getCertificateDetails(contract, certificateHash),
      getLatestBlockSummary(provider, receipt.blockNumber)
    ]);

    res.json({
      ok: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      certificateBefore,
      certificate,
      registryBefore,
      registry,
      issuer: {
        label: account.label,
        role: account.role,
        address: account.address,
        balanceBeforeEth: formatEth(balanceBefore),
        balanceAfterEth: formatEth(balanceAfter),
        nonceBefore,
        nonceAfter
      },
      latestBlock
    });
  } catch (error) {
    res.status(400).json({ ok: false, message: normalizeError(error) });
  }
});

// Start the Lab 4 API service for the Docker Compose frontend.
app.listen(port, () => {
  console.log(`Lab 4 API listening on port ${port}`);
});
