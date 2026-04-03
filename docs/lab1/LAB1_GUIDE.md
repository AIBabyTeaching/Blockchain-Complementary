# Lab 1 Teaching Guide

<p align="center">
  <img alt="Lab 1" src="https://img.shields.io/badge/Lab%201-Blockchain%20Foundations-0b1f3a?style=for-the-badge&logo=ethereum&logoColor=white" />
  <img alt="Docker first" src="https://img.shields.io/badge/Mode-Docker%20Only-1d7f5f?style=for-the-badge" />
  <img alt="Teaching goal" src="https://img.shields.io/badge/Goal-Visual%20and%20Easy-f4a261?style=for-the-badge" />
</p>

<div style="padding:16px 18px;border-radius:18px;background:linear-gradient(135deg,#0b1f3a,#17345f);color:#eef6ff;">
<strong>Purpose</strong><br/>
This first lab closes the conceptual gap fast, gives students something visible, and prepares the class for the certificate verification project that will drive the rest of the course.
</div>

## Learning Outcome

By the end of Lab 1, students should be able to:

- explain why hashing matters
- explain how blocks are chained together
- run a local blockchain teaching stack using Docker
- observe smart-contract state from a simple web interface
- connect Lab 1 to the later certificate registry labs

## Why This Lab Works

<table>
  <tr>
    <td><strong>Simple</strong></td>
    <td>Students only need Docker Desktop and VS Code.</td>
  </tr>
  <tr>
    <td><strong>Visual</strong></td>
    <td>The frontend shows concepts, chain health, and live contract state.</td>
  </tr>
  <tr>
    <td><strong>Practical</strong></td>
    <td>The Python demo explains blocks while Hardhat runs a local Ethereum node.</td>
  </tr>
  <tr>
    <td><strong>Extendable</strong></td>
    <td>The project already leaves space for Labs 2 to 6.</td>
  </tr>
</table>

## Lab Structure

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
  <div style="padding:14px;border-radius:16px;background:#0f172a;color:#e2e8f0;">
    <strong style="color:#7dd3fc;">15 min</strong><br/>Repair the concepts quickly.
  </div>
  <div style="padding:14px;border-radius:16px;background:#10241c;color:#ecfdf5;">
    <strong style="color:#6ee7b7;">20 min</strong><br/>Run the live demo.
  </div>
  <div style="padding:14px;border-radius:16px;background:#2a1c10;color:#fff7ed;">
    <strong style="color:#fdba74;">30 min</strong><br/>Students reproduce the demo.
  </div>
  <div style="padding:14px;border-radius:16px;background:#2a1020;color:#fdf2f8;">
    <strong style="color:#f9a8d4;">15 min</strong><br/>Students modify one thing.
  </div>
</div>

## Teaching Story

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

- [docker-compose.yml](/a:/BRAND%20NEW%20START/Ongoing/Feb%202026/Blockchain%20Complementary/docker-compose.yml)
- [labs/lab1/frontend/index.html](/a:/BRAND%20NEW%20START/Ongoing/Feb%202026/Blockchain%20Complementary/labs/lab1/frontend/index.html)
- [labs/lab1/api/src/server.js](/a:/BRAND%20NEW%20START/Ongoing/Feb%202026/Blockchain%20Complementary/labs/lab1/api/src/server.js)
- [labs/lab1/blockchain/contracts/SimpleStorage.sol](/a:/BRAND%20NEW%20START/Ongoing/Feb%202026/Blockchain%20Complementary/labs/lab1/blockchain/contracts/SimpleStorage.sol)
- [labs/lab1/python/blockchain_demo.py](/a:/BRAND%20NEW%20START/Ongoing/Feb%202026/Blockchain%20Complementary/labs/lab1/python/blockchain_demo.py)

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

<div style="padding:16px 18px;border-left:6px solid #3ddc97;background:#0e1a19;color:#dffaf0;border-radius:12px;">
Lab 1 is intentionally small. The exact same stack expands into local accounts, deployment, registry logic, access control, testing, and the final mini project.
</div>
