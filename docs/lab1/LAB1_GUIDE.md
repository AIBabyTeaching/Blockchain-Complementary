# Lab 1 Guide Guide

**Purpose:** close the conceptual gap quickly, give students something visible, and prepare the class for the certificate verification project that drives the rest of the course.

## Learning Outcomes

By the end of Lab 1, students should be able to:

- explain why hashing matters
- explain how blocks are chained together
- run a local blockchain Guide stack using Docker
- observe smart-contract state from a simple web interface
- connect Lab 1 to the later certificate registry labs

## Why This Lab Works

| Strength | Why it matters |
|---|---|
| Simple | Students only need Docker Desktop and VS Code. |
| Visual | The frontend shows concepts, chain health, and live contract state. |
| Practical | The Python demo explains blocks while Hardhat runs a local Ethereum node. |
| Extendable | The project already leaves space for Labs 2 to 6. |

## Lab Structure

| Time | Activity |
|---|---|
| 15 min | Repair the concepts quickly. |
| 20 min | Run the live demo. |
| 30 min | Students reproduce the demo. |
| 15 min | Students modify one thing. |

## Guide Story

1. Start with the Python script to show that changing one block changes the hash.
2. Move to the local chain and explain that Ethereum stores shared state.
3. Open the web app and show that smart-contract state can be read and updated.
4. End by showing how this becomes a certificate registry in later labs.

## Architecture

```text
Browser UI -> Node API -> Hardhat local blockchain -> Solidity contracts
                |
                -> Python demo for concept repair
```

## Files Used In Lab 1

- [docker-compose.yml](../../docker-compose.yml)
- [Frontend](../../labs/lab1/frontend/index.html)
- [API server](../../labs/lab1/api/src/server.js)
- [SimpleStorage contract](../../labs/lab1/blockchain/contracts/SimpleStorage.sol)
- [Python demo](../../labs/lab1/python/blockchain_demo.py)

## Run Order

```bash
docker compose up --build -d chain api frontend pythonlab
docker compose run --rm deployer
docker compose exec pythonlab python /workspace/labs/lab1/python/blockchain_demo.py
```

Then open `http://localhost:8080`.

## What To Say In Class

- "A hash is like a fingerprint for data. If the data changes, the fingerprint changes."
- "A block keeps its own data and the previous block hash, so tampering becomes visible."
- "A smart contract stores shared state that every node agrees on."
- "Today we are not chasing complexity. We are making the blockchain visible and understandable."

## Student Task

Ask students to change one item only:

- change the default number stored on chain
- change the lesson message
- modify the Python demo data
- change one frontend explanation card

## Bridge To Later Labs

Lab 1 is intentionally small. The exact same stack expands into local accounts, deployment, registry logic, access control, testing, and the final mini project.
