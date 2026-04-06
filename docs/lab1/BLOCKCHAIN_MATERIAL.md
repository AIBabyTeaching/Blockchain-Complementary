# Lab 1 Blockchain Material

**Main idea:** a blockchain is a structured way to store records so that changes are visible, shared, and difficult to fake without detection.

## 1. What Is a Blockchain?

A blockchain is a sequence of blocks.

Each block usually contains:

- some data
- its own hash
- the previous block hash

This creates a chain.

If someone changes one block, its hash changes. Once that happens, the link to the next block is broken. That is the core idea  must understand in Lab 1.

## 2. What Is a Hash?

A hash is a fixed-length digital fingerprint of data.

Important properties:

- the same input gives the same output
- a tiny change in input gives a very different output
- you cannot easily guess the original data from the hash

Simple classroom analogy:

A hash is like a tamper alarm for data. If the data changes, the alarm result changes immediately.

## 3. Why Do Hashes Matter in Blockchain?

Hashes help with:

- integrity
- tamper detection
- linking blocks together

Without hashes, blocks would just be separate records. With hashes, blocks become connected records.

## 4. What Is a Block?

A block is one container of blockchain data.

For Lab 1, a block has a very simple shape:

- block number or index
- timestamp
- data
- previous block hash
- current block hash

In the Python demo, this is enough to explain the idea clearly.

## 5. Why Does the Previous Hash Matter?

The previous hash is what connects one block to the block before it.

Example:

```text
Block 0 -> Block 1 -> Block 2
```

If `Block 1` changes, then its hash changes. That means `Block 2` is now pointing to the wrong previous hash. The chain becomes inconsistent.

That is why  should think of a blockchain as a linked structure, not just a list.

## 6. What Does Decentralization Mean?

Decentralization means the data is not controlled by one machine only.

Instead, multiple participants can share the same ledger state.

For Lab 1, say it simply:

- one copy of data on one computer is easy to hide or edit
- shared copies make silent tampering much harder

Do not overload this section with consensus algorithms in the first lab.

## 7. What Is a Smart Contract?

A smart contract is a program stored and executed on the blockchain.

It contains:

- state
- functions
- rules

In Lab 1, [SimpleStorage.sol](../../labs/lab1/blockchain/contracts/SimpleStorage.sol) is the smart contract.

It stores:

- a number
- a short lesson message

It allows us to:

- write new state with `store(...)`
- read state with `retrieve()`

## 8. What Is a Transaction?

A transaction is a request to change blockchain state.

In this lab, when the student clicks the button in the browser:

- the frontend sends a request to the API
- the API creates a blockchain transaction
- the contract state changes after the transaction is accepted

That is the simplest useful definition for the first lab.

## 9. Why Use a Local Blockchain First?

For Lab 1, a local blockchain is better because:

- it is fast
- it is free
- it avoids public-network setup friction
-  can focus on the workflow before learning deployment complexity

That is why this lab uses Hardhat in Docker instead of a public testnet.

## 10. What Happens in Lab 1 Technically?

```text
Python demo explains hashes and blocks
        |
Hardhat runs a local blockchain node
        |
SimpleStorage contract is deployed
        |
API reads and writes contract state
        |
Frontend shows the result visually
```

## 11. What  Must Remember From This Lab

 should leave the room with these exact ideas:

- a hash is a fingerprint of data
- a block keeps data plus a link to the previous block
- changing a block changes its hash
- blockchain state can be read and updated through smart contracts
- local blockchain development is enough to learn the workflow safely

## 12. Common Misunderstandings To Correct Early

### Misunderstanding 1

"Blockchain means cryptocurrency only."

Correction: blockchain is a data and trust model. Cryptocurrency is only one application.

### Misunderstanding 2

"A smart contract is intelligent."

Correction: a smart contract is code with rules. It is not smart in the AI sense.

### Misunderstanding 3

"If data is on blockchain, it can never be changed."

Correction: state can change through valid transactions, but the history of those changes is visible.

## 13. Guide Bridge to the Certificate Project

The class project direction is:

```text
hashing -> blocks -> smart contracts -> student registry -> certificate verification
```

That is why Lab 1 matters. It is the first stable mental model for everything that follows.

## 14. Suggested Closing Questions

Ask :

- Why does changing one block affect the rest of the chain?
- Why might a university want certificate verification on blockchain?
- Why are we using a local blockchain first instead of a public network?

## 15. What This Lab Proves — Three Concrete Results

This section answers the question: "What did  actually see happen, and why does it matter?"

### Proof 1 — Hashing is deterministic and collision-sensitive

The Python demo ran three blocks and then changed one block's data.

What  saw:

- the original hash of block #1: `e67aca9...`
- the tampered hash after changing the data: `0c33b84...`
- `Match? : False`

What this proves: the same data always produces the same hash. Change even one character and the result is completely different. This is not a rule  have to believe — they watched it happen.

### Proof 2 — Blocks are chained by hash, so tampering is visible

Each block in the Python demo stored the previous block's hash.

What this proves: if block #1 is changed, its hash changes. Block #2's "previous hash" field no longer matches. The chain is broken — and that break is visible to anyone who checks.

 should understand: you cannot silently edit a block in the middle because the chain itself exposes the inconsistency.

### Proof 3 — A smart contract is shared, auditable state

Two contracts were deployed to the local Ethereum node:
- `SimpleStorage` at `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- `CertificateRegistry` at `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`

The frontend at `http://localhost:8080` read live state from those contracts through the API. No database was involved. No single person controls that state.

What this proves: any party with the contract address can read the state. Any valid transaction changes it. The history is on the chain. This is the architecture of the certificate registry project.

**The through-line for :**

> A certificate on paper can be forged. A certificate whose hash is stored in a smart contract cannot be silently changed — because the chain itself would break.

That is the bridge from Lab 1 to the full certificate registry project in Labs 2–6.

---

## 16. Docker Services — What Each One Does and Why

The lab uses five Docker services. Each one has a specific job.

### `chain` — the local Ethereum node

**Image:** `node:20-alpine` with Hardhat installed

**What it does:** runs `npx hardhat node`, which starts a local Ethereum JSON-RPC server on port `8545`.

**Why it exists:**  need a real blockchain to deploy contracts to and send transactions against. Hardhat's node gives them that instantly, with 20 pre-funded test accounts, without any public network, fees, or wallet setup.

**Port:** `8545` — the standard Ethereum RPC port.

---

### `deployer` — the one-shot contract deployer

**Image:** reuses the `chain` image (same Node/Hardhat environment)

**What it does:** runs `npx hardhat compile` then `npx hardhat run scripts/deploy.js`, which deploys `SimpleStorage` and `CertificateRegistry` to the running `chain` node. It exits when done.

**Why it exists:** deployment is a separate step from running the node. Keeping it as a one-shot container means  can re-deploy cleanly without restarting the chain, and the step is visible and explicit in the lab workflow.

**Depends on:** `chain` must be running first.

---

### `api` — the Node.js backend

**Image:** `node:20-alpine`

**What it does:** runs `src/server.js`, a lightweight Express server on port `3000`. It reads deployment addresses from the deployer output and exposes REST endpoints for the frontend to read and write contract state.

**Why it exists:** the frontend is plain HTML/JS and cannot talk to the Ethereum RPC directly without a wallet extension. The API acts as a trusted bridge, using a fixed private key (`ADMIN_PRIVATE_KEY`) to sign transactions on behalf of the student during the demo.

**Port:** `3000`

**Depends on:** `chain`

---

### `frontend` — the web UI

**Image:** `nginx:1.27-alpine`

**What it does:** serves the static files in `labs/lab1/frontend/` — `index.html`, `styles.css`, and `app.js` — as a plain website on port `8080`.

**Why it exists:** the lab needs something visual.  open `http://localhost:8080` and see live contract state, can trigger a transaction, and watch the value update. This makes the blockchain tangible rather than abstract.

**Port:** `8080 → 80`

**Depends on:** `api`

---

### `pythonlab` — the concept demo environment

**Image:** `python:3.12-alpine`

**What it does:** keeps a Python environment alive (`tail -f /dev/null`) so  can run `blockchain_demo.py` inside it on demand.

**Why it exists:** the Python demo is a pure concept tool — no Ethereum, no contracts. It shows hashing and chaining with plain Python so  grasp the data-structure idea before touching the real chain. Keeping it as a persistent container means  can re-run it or modify it without rebuilding anything.
