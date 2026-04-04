# Lab 1 Blockchain Material

**Main idea:** a blockchain is a structured way to store records so that changes are visible, shared, and difficult to fake without detection.

## 1. What Is a Blockchain?

A blockchain is a sequence of blocks.

Each block usually contains:

- some data
- its own hash
- the previous block hash

This creates a chain.

If someone changes one block, its hash changes. Once that happens, the link to the next block is broken. That is the core idea students must understand in Lab 1.

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

That is why students should think of a blockchain as a linked structure, not just a list.

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
- students can focus on the workflow before learning deployment complexity

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

## 11. What Students Must Remember From This Lab

Students should leave the room with these exact ideas:

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

Ask students:

- Why does changing one block affect the rest of the chain?
- Why might a university want certificate verification on blockchain?
- Why are we using a local blockchain first instead of a public network?
