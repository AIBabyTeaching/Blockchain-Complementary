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
3. Lab 3: deploy and use a classroom voting smart contract.
4. Lab 4: certificate registry contract.
5. Lab 5: access control, security, and tests.
6. Lab 6: mini-project demo and presentations.

## Quick start

```bash
docker compose up -d chain api frontend pythonlab
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

Lab 2 runs on separate ports and uses the same local chain:

```bash
docker compose up -d chain lab2-api lab2-frontend
```

Then open:

- Lab 2 frontend: `http://localhost:8081`
- Lab 2 API: `http://localhost:3001/api/health`

Lab 3 also runs on separate ports and uses the same local chain:

```bash
docker compose up -d chain lab3-api lab3-frontend
docker compose run --rm lab3-deployer
```

Then open:

- Lab 3 frontend: `http://localhost:8082`
- Lab 3 API: `http://localhost:3002/api/health`

## Why no rebuild is needed for normal edits

The Compose stack now uses official base images plus bind mounts and named volumes:

- source code is mounted from the workspace into the containers
- `node_modules` stay in Docker volumes
- frontend files are served directly from the mounted lab folders

So after code changes, `docker compose up -d ...` is enough in normal working flow. Rebuilds are only needed if you deliberately change image-level behavior.

## Guide intent

Lab 1 is deliberately lightweight:

- quick concept repair
- visual demo of hashes and chained blocks
- local blockchain only
- no public testnet friction
- room to evolve into the certificate registry project
