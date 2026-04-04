# Lab 1 Session Script

## Opening

"Today we repair the foundations very quickly, then we touch a live blockchain system running locally in Docker."

## Segment 1: Hashes

- Run the Python demo.
- Show how the original and tampered hashes differ.
- Explain that integrity is the point, not memorizing cryptography details.

## Segment 2: Blocks

- Point to `previous_hash` in the Python output.
- Explain that each block depends on what came before it.
- State clearly that this is the minimum mental model students need.

## Segment 3: Local Blockchain

- Start the Docker stack.
- Explain that Hardhat gives a local Ethereum environment.
- Mention that local development avoids public-chain cost and setup friction.

## Segment 4: Smart Contract State

- Deploy `SimpleStorage`.
- Open the frontend.
- Refresh chain state and update the stored number.
- Emphasize that the blockchain is now storing shared state, not just theory.

## Segment 5: Future Direction

- Show `CertificateRegistry.sol`.
- Say that this is where the course is going next.
- Tie it to student registry and certificate verification.

## Closing

Question:

- What changes when data inside a block changes?
- Why is a local chain useful for learning?
- What kind of university data could be verified on chain?
