# Blockchain Complementary Guide Kit

A Docker-first Guide workspace for the rescued blockchain course led by **Eng. Ahmed Metwalli**.

## What is here

- `docs/` Guide material and lab guides.
- `labs/lab1/` the first working lab, kept simple and visual.
- `labs/lab2` to `labs/lab6/` reserved for the remaining roadmap.
- `infra/docker/` Dockerfiles for the Guide stack.
- `docker-compose.yml` one command to run the course environment.

## Lab sequence

1. Lab 1: hashing, blocks, local chain, and a tiny full-stack blockchain app.
2. Lab 2: Hardhat node and local Ethereum accounts.
3. Lab 3: `SimpleStorage` deployment and interaction.
4. Lab 4: certificate or student registry contract.
5. Lab 5: access control, security, and tests.
6. Lab 6: mini-project demo and student presentations.

## Quick start

```bash
docker compose up --build -d chain api frontend pythonlab
```

Then open:

- Frontend: `http://localhost:8080`
- API: `http://localhost:3000/api/health`

Useful commands:

```bash
docker compose run --rm dev npm install --prefix /workspace/labs/lab1/blockchain
docker compose run --rm api npm install --prefix /workspace/labs/lab1/api
docker compose run --rm dev npx hardhat compile --config /workspace/labs/lab1/blockchain/hardhat.config.js
docker compose run --rm deployer
docker compose exec pythonlab python /workspace/labs/lab1/python/blockchain_demo.py
```

## Guide intent

Lab 1 is deliberately lightweight:

- quick concept repair
- visual demo of hashes and chained blocks
- local blockchain only
- no public testnet friction
- room to evolve into the certificate registry project
