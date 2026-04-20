import express from "express";
import cors from "cors";
import { ethers } from "ethers";

// This API powers Lab 2.
// Unlike Lab 1, the focus here is not smart-contract state yet.
// The focus is the transaction foundation underneath everything else:
// accounts, balances, nonces, and native ETH transfers.

const app = express();
const port = Number(process.env.PORT || 3001);
const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";

app.use(cors());
app.use(express.json());

const localProfiles = [
  {
    label: "Account 1",
    role: "Deployer wallet"
  },
  {
    label: "Account 2",
    role: "Verifier wallet"
  },
  {
    label: "Account 3",
    role: "Registrar wallet"
  },
  {
    label: "Account 4",
    role: "Reader wallet"
  }
];

const conceptCards = [
  {
    title: "Account",
    detail: "An Ethereum account is an identity on the chain. It has an address, a balance, and a transaction counter called a nonce."
  },
  {
    title: "Signer",
    detail: "A signer proves who is sending the transaction. In this lab, the API uses the selected unlocked Hardhat account as signer."
  },
  {
    title: "Value Transfer",
    detail: "A transfer does not need a smart contract. One account can send native ETH directly to another account."
  },
  {
    title: "Nonce",
    detail: "Every outgoing transaction increases the sender nonce by one. This keeps transactions ordered and unique."
  }
];

const transactionStages = [
  "The browser sends sender, receiver, and amount to the Lab 2 API.",
  "The API chooses the correct wallet and signs a local transaction.",
  "The Hardhat node validates and mines the transaction into a block.",
  "The sender balance decreases, the receiver balance increases, and the sender nonce increments.",
  "The frontend reads the latest balances and block details back from the chain."
];

const transferRules = [
  "Sender and receiver must be two different local accounts.",
  "The amount must be greater than zero.",
  "The sender must have enough ETH for both the transfer value and gas.",
  "Only the sender nonce changes because only the sender created a new transaction.",
  "Every successful transfer creates a new transaction hash and usually a new block on the local chain."
];

function buildProvider() {
  return new ethers.JsonRpcProvider(rpcUrl);
}

function formatEth(value) {
  return Number(ethers.formatEther(value)).toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}

function formatGwei(value) {
  return Number(ethers.formatUnits(value, "gwei")).toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
}

async function buildWalletCatalog(provider) {
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

function findWallet(catalog, address) {
  return catalog.find((entry) => entry.address.toLowerCase() === String(address).toLowerCase());
}

function sanitizeAccount(entry, balanceWei, nonce) {
  return {
    label: entry.label,
    role: entry.role,
    address: entry.address,
    balanceEth: formatEth(balanceWei),
    nonce
  };
}

async function getAccountsSnapshot(provider) {
  const catalog = await buildWalletCatalog(provider);
  return Promise.all(
    catalog.map(async (entry) => {
      const [balanceWei, nonce] = await Promise.all([
        provider.getBalance(entry.address),
        provider.getTransactionCount(entry.address)
      ]);

      return sanitizeAccount(entry, balanceWei, nonce);
    })
  );
}

async function getLatestBlockSummary(provider) {
  const blockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNumber);

  if (!block) {
    return {
      blockNumber,
      timestampIso: null,
      transactionCount: 0,
      gasUsed: "0",
      lastTransaction: null
    };
  }

  let lastTransaction = null;
  if (block.transactions.length > 0) {
    const txHash = block.transactions[block.transactions.length - 1];
    const [tx, receipt] = await Promise.all([
      provider.getTransaction(txHash),
      provider.getTransactionReceipt(txHash)
    ]);

    if (tx && receipt) {
      lastTransaction = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        valueEth: formatEth(tx.value),
        status: receipt.status,
        gasUsed: receipt.gasUsed.toString(),
        gasPriceGwei: tx.gasPrice ? formatGwei(tx.gasPrice) : null
      };
    }
  }

  return {
    blockNumber,
    timestampIso: new Date(Number(block.timestamp) * 1000).toISOString(),
    transactionCount: block.transactions.length,
    gasUsed: block.gasUsed.toString(),
    lastTransaction
  };
}

app.get("/api/health", async (_req, res) => {
  try {
    const provider = buildProvider();
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber()
    ]);

    res.json({
      ok: true,
      rpcUrl,
      chainId: Number(network.chainId),
      blockNumber
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get("/api/foundation", (_req, res) => {
  res.json({
    ok: true,
    title: "Lab 2: local accounts, balances, and transactions",
    objectives: [
      "Identify the difference between account, wallet, signer, and address.",
      "Read balances and nonces from a local Ethereum node.",
      "Send a native ETH transaction between local accounts.",
      "Observe how a new transaction affects balances, nonce, and block history."
    ],
    cards: conceptCards,
    stages: transactionStages,
    transferRules
  });
});

app.get("/api/accounts", async (_req, res) => {
  try {
    const provider = buildProvider();
    const accounts = await getAccountsSnapshot(provider);
    res.json({ ok: true, accounts });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get("/api/blocks/latest", async (_req, res) => {
  try {
    const provider = buildProvider();
    const latestBlock = await getLatestBlockSummary(provider);
    res.json({ ok: true, latestBlock });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.post("/api/transactions/transfer", async (req, res) => {
  const { senderAddress, receiverAddress, amountEth } = req.body;

  if (typeof senderAddress !== "string" || typeof receiverAddress !== "string") {
    return res.status(400).json({
      ok: false,
      message: "senderAddress and receiverAddress must both be strings."
    });
  }

  if (senderAddress.toLowerCase() === receiverAddress.toLowerCase()) {
    return res.status(400).json({
      ok: false,
      message: "Sender and receiver must be different accounts."
    });
  }

  const amountText = String(amountEth ?? "").trim();
  if (!amountText || Number(amountText) <= 0) {
    return res.status(400).json({
      ok: false,
      message: "amountEth must be a positive number."
    });
  }

  try {
    const amountWei = ethers.parseEther(amountText);
    const provider = buildProvider();
    const catalog = await buildWalletCatalog(provider);

    const sender = findWallet(catalog, senderAddress);
    const receiver = findWallet(catalog, receiverAddress);

    if (!sender || !receiver) {
      return res.status(404).json({
        ok: false,
        message: "Use one of the listed local Hardhat accounts for both sender and receiver."
      });
    }

    const [
      senderBalanceBefore,
      receiverBalanceBefore,
      senderNonceBefore
    ] = await Promise.all([
      provider.getBalance(sender.address),
      provider.getBalance(receiver.address),
      provider.getTransactionCount(sender.address)
    ]);

    if (senderBalanceBefore < amountWei) {
      return res.status(400).json({
        ok: false,
        message: "Sender balance is too low for this transfer."
      });
    }

    const tx = await sender.signer.sendTransaction({
      to: receiver.address,
      value: amountWei
    });

    const receipt = await tx.wait();

    const [
      senderBalanceAfter,
      receiverBalanceAfter,
      senderNonceAfter,
      receiverNonceAfter,
      latestBlock
    ] = await Promise.all([
      provider.getBalance(sender.address),
      provider.getBalance(receiver.address),
      provider.getTransactionCount(sender.address),
      provider.getTransactionCount(receiver.address),
      getLatestBlockSummary(provider)
    ]);

    res.json({
      ok: true,
      txHash: tx.hash,
      blockNumber: receipt ? receipt.blockNumber : null,
      transfer: {
        amountEth: formatEth(amountWei),
        gasUsed: receipt ? receipt.gasUsed.toString() : null,
        gasPriceGwei: tx.gasPrice ? formatGwei(tx.gasPrice) : null
      },
      sender: {
        label: sender.label,
        role: sender.role,
        address: sender.address,
        balanceBeforeEth: formatEth(senderBalanceBefore),
        balanceAfterEth: formatEth(senderBalanceAfter),
        nonceBefore: senderNonceBefore,
        nonceAfter: senderNonceAfter
      },
      receiver: {
        label: receiver.label,
        role: receiver.role,
        address: receiver.address,
        balanceBeforeEth: formatEth(receiverBalanceBefore),
        balanceAfterEth: formatEth(receiverBalanceAfter),
        nonceAfter: receiverNonceAfter
      },
      latestBlock
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Lab 2 API listening on port ${port}`);
});
