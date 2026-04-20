import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

// Lab 3 turns the transaction foundations from Lab 2 into the first
// deliberate smart-contract interaction lab. You now see:
// - a real contract deployment
// - a rule enforced on-chain
// - different addresses calling the same contract
// - state and event history changing after each vote

const app = express();
const port = Number(process.env.PORT || 3002);
const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
const labRoot = process.env.LAB_ROOT || "/workspace/labs/lab3";

app.use(cors());
app.use(express.json());

const localProfiles = [
  { label: "Account 1", role: "Organizer wallet" },
  { label: "Account 2", role: "Voter A" },
  { label: "Account 3", role: "Voter B" },
  { label: "Account 4", role: "Voter C" }
];

const conceptCards = [
  {
    title: "Contract Call",
    detail: "A vote is not just a transfer. It is a transaction that executes contract logic and changes shared contract state."
  },
  {
    title: "State Rule",
    detail: "The contract enforces one address = one vote, so the rule does not depend on trusting the frontend."
  },
  {
    title: "Deadline",
    detail: "Voting remains open only until the stored deadline. After that point, the same function call reverts."
  },
  {
    title: "Event Log",
    detail: "Each successful vote emits an event. The API can read these events later to reconstruct a vote history."
  }
];

const votingStages = [
  "The browser chooses a voter account and proposal.",
  "The API validates the request and loads the deployed ClassroomVoting contract.",
  "The selected local account signs the vote transaction.",
  "The Hardhat node mines the contract call into a block.",
  "The frontend reloads proposal totals, voter state, and vote history from the contract."
];

const votingRules = [
  "Only deployed proposals can receive votes.",
  "Each address can vote only once.",
  "Voting ends automatically when the deadline is reached.",
  "The proposal totals live inside the smart contract, not in the browser.",
  "Every successful vote creates both a transaction receipt and a contract event."
];

function buildProvider() {
  return new ethers.JsonRpcProvider(rpcUrl);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getDeployment() {
  return readJson(path.join(labRoot, "blockchain", "deployments", "localhost.json"));
}

function getVotingArtifact() {
  return readJson(
    path.join(
      labRoot,
      "blockchain",
      "artifacts",
      "contracts",
      "ClassroomVoting.sol",
      "ClassroomVoting.json"
    )
  );
}

function formatEth(value) {
  return Number(ethers.formatEther(value)).toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}

async function getFreshBlockNumber(provider) {
  const blockHex = await provider.send("eth_blockNumber", []);
  return Number(BigInt(blockHex));
}

function normalizeError(error) {
  return (
    error?.shortMessage ||
    error?.info?.error?.message ||
    error?.reason ||
    error?.message ||
    "Unknown error."
  );
}

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

function findAccount(catalog, address) {
  return catalog.find((entry) => entry.address.toLowerCase() === String(address).toLowerCase());
}

async function getVotingContract(withSignerAddress = "") {
  const deployment = getDeployment();
  const artifact = getVotingArtifact();

  if (!deployment || !artifact || !deployment.contracts?.ClassroomVoting) {
    return {
      ok: false,
      status: 404,
      message: "Lab 3 contract metadata is missing. Run: docker compose run --rm lab3-deployer"
    };
  }

  const contractAddress = deployment.contracts.ClassroomVoting;
  if (!ethers.isAddress(contractAddress)) {
    return {
      ok: false,
      status: 500,
      message: "Lab 3 deployment file is invalid. Re-run the Lab 3 deployer."
    };
  }

  const provider = buildProvider();
  const code = await provider.getCode(contractAddress);
  if (!code || code === "0x") {
    return {
      ok: false,
      status: 409,
      message: "ClassroomVoting is not deployed on the current chain state. Run: docker compose run --rm lab3-deployer"
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
      message: "Use one of the listed local Hardhat accounts when sending a vote."
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

async function getElectionSummary(contract, deployment) {
  const [
    electionTitle,
    organizer,
    votingDeadline,
    isVotingOpen,
    remainingSeconds,
    votersParticipated,
    proposalCount
  ] = await Promise.all([
    contract.electionTitle(),
    contract.organizer(),
    contract.votingDeadline(),
    contract.isVotingOpen(),
    contract.remainingSeconds(),
    contract.votersParticipated(),
    contract.proposalCount()
  ]);

  const proposals = [];
  let totalVotes = 0;
  for (let index = 0; index < Number(proposalCount); index += 1) {
    const [name, voteCount] = await contract.getProposal(index);
    const proposal = {
      index,
      name,
      voteCount: Number(voteCount)
    };

    totalVotes += proposal.voteCount;
    proposals.push(proposal);
  }

  let leader = null;
  if (proposals.length > 0) {
    leader = proposals.reduce((best, current) => {
      if (!best || current.voteCount > best.voteCount) {
        return current;
      }

      return best;
    }, null);
  }

  return {
    contractAddress: deployment.contracts.ClassroomVoting,
    electionTitle,
    organizer,
    votingDeadline: Number(votingDeadline),
    deadlineIso: new Date(Number(votingDeadline) * 1000).toISOString(),
    isVotingOpen,
    remainingSeconds: Number(remainingSeconds),
    votersParticipated: Number(votersParticipated),
    proposalCount: proposals.length,
    totalVotes,
    proposals,
    leader
  };
}

async function getAccountsSnapshot(provider, contract = null) {
  const catalog = await buildAccountCatalog(provider);
  const blockTag = await getFreshBlockNumber(provider);

  return Promise.all(
    catalog.map(async (entry) => {
      const [balanceWei, nonce] = await Promise.all([
        provider.getBalance(entry.address, blockTag),
        provider.getTransactionCount(entry.address, blockTag)
      ]);

      let voteState = {
        hasVoted: false,
        selectedProposalIndex: null,
        selectedProposalName: null
      };

      if (contract) {
        const [hasVoted, proposalIndex] = await contract.voteInfo(entry.address);
        if (hasVoted) {
          const [proposalName] = await contract.getProposal(Number(proposalIndex));
          voteState = {
            hasVoted: true,
            selectedProposalIndex: Number(proposalIndex),
            selectedProposalName: proposalName
          };
        }
      }

      return {
        label: entry.label,
        role: entry.role,
        address: entry.address,
        balanceEth: formatEth(balanceWei),
        nonce,
        ...voteState
      };
    })
  );
}

async function getVoteHistory(contract, deployment, provider) {
  const fromBlock = deployment.deployedBlock || 0;
  const events = await contract.queryFilter(contract.filters.VoteCast(), fromBlock);
  const recentEvents = events.slice(-10).reverse();

  return Promise.all(
    recentEvents.map(async (event) => {
      const block = await provider.getBlock(event.blockNumber);
      return {
        voter: event.args.voter,
        proposalIndex: Number(event.args.proposalIndex),
        proposalName: event.args.proposalName,
        newVoteCount: Number(event.args.newVoteCount),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestampIso: block ? new Date(Number(block.timestamp) * 1000).toISOString() : null
      };
    })
  );
}

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
      contractDeploymentFound: Boolean(getDeployment()?.contracts?.ClassroomVoting)
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: normalizeError(error) });
  }
});

app.get("/api/foundation", (_req, res) => {
  res.json({
    ok: true,
    title: "Lab 3: first smart-contract voting DApp",
    objectives: [
      "Deploy a real Solidity contract to the local chain.",
      "Read contract state and events through an API.",
      "Send a state-changing vote transaction from a selected local account.",
      "Observe how contract rules enforce one address = one vote and deadline-based access."
    ],
    cards: conceptCards,
    stages: votingStages,
    votingRules
  });
});

app.get("/api/accounts", async (_req, res) => {
  try {
    const provider = buildProvider();
    const contractResult = await getVotingContract();
    const accounts = await getAccountsSnapshot(
      provider,
      contractResult.ok ? contractResult.contract : null
    );

    res.json({
      ok: true,
      deploymentReady: contractResult.ok,
      accounts
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: normalizeError(error) });
  }
});

app.get("/api/election", async (_req, res) => {
  try {
    const contractResult = await getVotingContract();
    if (!contractResult.ok) {
      return res.status(contractResult.status).json({
        ok: false,
        message: contractResult.message
      });
    }

    const [election, latestBlock] = await Promise.all([
      getElectionSummary(contractResult.contract, contractResult.deployment),
      getLatestBlockSummary(contractResult.provider)
    ]);

    res.json({
      ok: true,
      election,
      latestBlock
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: normalizeError(error) });
  }
});

app.get("/api/election/history", async (_req, res) => {
  try {
    const contractResult = await getVotingContract();
    if (!contractResult.ok) {
      return res.status(contractResult.status).json({
        ok: false,
        message: contractResult.message
      });
    }

    const history = await getVoteHistory(
      contractResult.contract,
      contractResult.deployment,
      contractResult.provider
    );

    res.json({ ok: true, history });
  } catch (error) {
    res.status(500).json({ ok: false, message: normalizeError(error) });
  }
});

app.post("/api/election/vote", async (req, res) => {
  const { voterAddress, proposalIndex } = req.body;

  if (typeof voterAddress !== "string") {
    return res.status(400).json({
      ok: false,
      message: "voterAddress must be a string."
    });
  }

  if (!Number.isInteger(proposalIndex) || proposalIndex < 0) {
    return res.status(400).json({
      ok: false,
      message: "proposalIndex must be a non-negative integer."
    });
  }

  try {
    const contractResult = await getVotingContract(voterAddress);
    if (!contractResult.ok) {
      return res.status(contractResult.status).json({
        ok: false,
        message: contractResult.message
      });
    }

    const { provider, contract, deployment, account } = contractResult;
    const beforeBlockTag = await getFreshBlockNumber(provider);
    const proposalCount = Number(await contract.proposalCount());
    if (proposalIndex >= proposalCount) {
      return res.status(400).json({
        ok: false,
        message: "proposalIndex does not match any deployed proposal."
      });
    }

    const [
      voterBalanceBefore,
      voterNonceBefore,
      voteInfoBefore,
      proposalBefore
    ] = await Promise.all([
      provider.getBalance(account.address, beforeBlockTag),
      provider.getTransactionCount(account.address, beforeBlockTag),
      contract.voteInfo(account.address),
      contract.getProposal(proposalIndex)
    ]);

    if (voteInfoBefore[0]) {
      return res.status(400).json({
        ok: false,
        message: "This address has already voted in the current election."
      });
    }

    const tx = await contract.vote(proposalIndex);
    const receipt = await tx.wait();

    const [
      voterBalanceAfter,
      voterNonceAfter,
      voteInfoAfter,
      proposalAfter,
      election,
      latestBlock
    ] = await Promise.all([
      provider.getBalance(account.address, receipt.blockNumber),
      provider.getTransactionCount(account.address, receipt.blockNumber),
      contract.voteInfo(account.address),
      contract.getProposal(proposalIndex),
      getElectionSummary(contract, deployment),
      getLatestBlockSummary(provider, receipt.blockNumber)
    ]);

    res.json({
      ok: true,
      txHash: tx.hash,
      blockNumber: receipt ? receipt.blockNumber : null,
      voter: {
        label: account.label,
        role: account.role,
        address: account.address,
        balanceBeforeEth: formatEth(voterBalanceBefore),
        balanceAfterEth: formatEth(voterBalanceAfter),
        nonceBefore: voterNonceBefore,
        nonceAfter: voterNonceAfter,
        hasVotedAfter: voteInfoAfter[0],
        selectedProposalIndexAfter: Number(voteInfoAfter[1])
      },
      proposal: {
        index: proposalIndex,
        name: proposalAfter[0],
        votesBefore: Number(proposalBefore[1]),
        votesAfter: Number(proposalAfter[1])
      },
      election,
      latestBlock
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: normalizeError(error) });
  }
});

app.listen(port, () => {
  console.log(`Lab 3 API listening on port ${port}`);
});
