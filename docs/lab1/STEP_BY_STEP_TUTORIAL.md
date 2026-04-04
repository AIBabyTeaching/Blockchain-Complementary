# Lab 1 Step-by-Step Tutorial

**Goal:** run a local blockchain environment, observe how blocks and hashes behave, deploy a simple smart contract, and interact with it from a browser.

## Before You Start

You need:

- Docker Desktop installed and running
- VS Code installed
- this project folder opened in VS Code

You do not need to install Node.js, Python, Hardhat, or Ethers on your machine. The lab uses containers for all of that.

## Big Picture

This lab has four parts:

1. Understand hashes and blocks with Python.
2. Start a local Ethereum-like blockchain with Hardhat.
3. Deploy a simple contract called `SimpleStorage`.
4. Use a small web app to read and update blockchain state.

## Step 1: Open the Project

Open the `Blockchain Complementary` folder.

Confirm that these files exist:

- [docker-compose.yml](../../docker-compose.yml)
- [Lab 1 README](../../labs/lab1/README.md)
- [Python demo](../../labs/lab1/python/blockchain_demo.py)
- [SimpleStorage contract](../../labs/lab1/blockchain/contracts/SimpleStorage.sol)

## Step 2: Start the Main Containers

Run:

```bash
docker compose up --build -d chain api frontend pythonlab
```

What this starts:

- `chain`: local blockchain node using Hardhat
- `api`: Node.js backend that talks to the blockchain
- `frontend`: browser interface
- `pythonlab`: Python container for the concept demo

## Step 3: Confirm the Containers Are Running

Run:

```bash
docker compose ps
```

You should see these services running:

- `bc-lab1-chain`
- `bc-lab1-api`
- `bc-lab1-frontend`
- `bc-lab1-python`

If something is not up, inspect the logs:

```bash
docker compose logs chain
docker compose logs api
docker compose logs frontend
```

## Step 4: Run the Blockchain Foundations Demo

Run:

```bash
docker compose exec pythonlab python /workspace/labs/lab1/python/blockchain_demo.py
```

What to look for:

- each block has data
- each block stores the previous block hash
- when data changes, the hash changes
- this is how tampering becomes visible

**Guide note:** stop here and ask students why the tampered block produces a different hash. Do not move on until they answer that clearly.

## Step 5: Deploy the Smart Contract

Run:

```bash
docker compose run --rm deployer
```

What this does:

- installs the blockchain package dependencies inside the container
- compiles the Solidity contracts
- deploys `SimpleStorage`
- deploys `CertificateRegistry`
- writes deployment details into the `deployments` folder

## Step 6: Open the Frontend

Open:

```text
http://localhost:8080
```

You should see:

- a Lab 1 page
- concept cards
- chain health
- smart-contract state
- a form that writes a new value to the blockchain

## Step 7: Check That the Blockchain Is Live

Open:

```text
http://localhost:3000/api/health
```

You should see JSON with:

- `ok: true`
- a block number
- the RPC URL

## Step 8: Read the Contract State

From the browser page:

- look at the current favorite number
- look at the lesson message
- click `Refresh from blockchain`

This reads the `SimpleStorage` contract from the local chain.

## Step 9: Write a New Value to the Blockchain

In the browser page:

1. enter a new number
2. write a short lesson message
3. click `Send transaction`

What happens next:

- the frontend sends the request to the API
- the API signs a transaction
- the local blockchain stores the new state
- the page shows the new value after the transaction is mined

## Step 10: Show Students the Contract Code

Open [SimpleStorage.sol](../../labs/lab1/blockchain/contracts/SimpleStorage.sol).

Explain only these parts:

- `favoriteNumber` is stored on chain
- `lessonMessage` is stored on chain
- `store(...)` updates the state
- `retrieve()` reads the state

Do not overload the first session with advanced Solidity topics.

## Step 11: Connect Lab 1 to the Course Project

Open [CertificateRegistry.sol](../../labs/lab1/blockchain/contracts/CertificateRegistry.sol).

Explain:

- today we used a small contract so the workflow stays easy
- later labs will extend the exact same stack into certificate verification and student registry logic

## Troubleshooting

### The frontend opens but the contract data is missing

Run:

```bash
docker compose run --rm deployer
```

The contracts were probably not deployed yet.

### The API is not responding

Run:

```bash
docker compose logs api
```

### The blockchain is not responding

Run:

```bash
docker compose logs chain
```

### I want to stop everything

Run:

```bash
docker compose down
```

## What Students Should Learn Today

By the end of this lab, students should be able to say:

- a hash changes when the data changes
- a block points to the previous block through its hash
- a blockchain is a chain of linked records
- a smart contract stores shared state on the blockchain
- Docker can isolate the full development environment

## Mini Task for Students

Choose only one:

- change the default number in the contract
- change the default lesson message in the UI
- change the data in the Python blockchain demo
- change one concept card in the frontend
