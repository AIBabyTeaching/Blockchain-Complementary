import hashlib
  # Import hashlib module - provides cryptographic hash functions including SHA256.
import json
  # Import json module - converts Python objects to/from JSON string format for serialization.
from dataclasses import dataclass
  # Import @dataclass decorator - automatically generates __init__, __repr__, __eq__ and other methods.
from time import time
  # Import time() function - returns current Unix timestamp as a float (seconds since 1970).


# This Python file is NOT a real blockchain node.
# It IS a teaching model that explains:
# 1. A block containing data + reference to previous block
# 2. A hash acting as a fingerprint (tiny change = totally different hash)
# 3. A chain being formed by hashes linking blocks together
# 4. Tampering becoming visible when a hash changes (breaking the chain link)


@dataclass
  # ^ @dataclass decorator automatically generates __init__, __repr__, __eq__ and other methods.
class Block:
  # Define Block class - each instance represents one immutable block that would be stored in a blockchain.
    # A block is the smallest unit in this demo blockchain.
    # It stores its own data plus a link (hash) to the previous block.
    index: int
      # ^ Type annotation: index must be an integer. The block's position in the chain (0=first, 1=second...).
    timestamp: float
      # ^ Type annotation: timestamp must be a float. Unix timestamp when this block was created.
    data: str
      # ^ Type annotation: data must be a string. The actual content/payload that this block stores.
    previous_hash: str
      # ^ Type annotation: previous_hash must be a string. The SHA256 fingerprint of the PREVIOUS block.

    @property
      # ^ @property decorator makes the hash() method act like a field (access as block.hash, not block.hash()).
    def hash(self) -> str:
        # Method: compute and return the SHA256 fingerprint of THIS block.
        # The hash includes all four fields, so ANY change = COMPLETELY different hash (avalanche effect).
        # Note: The hash is recalculated every time it's accessed (not stored/cached permanently).
        # The "-> str" type hint means this method returns a string.
        payload = json.dumps(
            # json.dumps() converts a Python dict to a JSON string that will be hashed.
            # We need to convert the block data to a string before SHA256 can hash it.
            {
                "index": self.index,
                  # ^ Include block's index in the hash input (so block position change = hash change).
                "timestamp": self.timestamp,
                  # ^ Include timestamp in the hash input (so time change = hash change).
                "data": self.data,
                  # ^ Include block's data in the hash input (so tampering = detectable via hash change).
                "previous_hash": self.previous_hash,
                  # ^ Include previous block's hash (validates chain link, breaking chain = obvious tampering).
            },
            sort_keys=True,
              # ^ sort_keys=True: alphabetize dictionary keys before JSON conversion.
              # ^ This ensures identical data ALWAYS produces identical JSON string and identical hash.
        ).encode()
            # ^ .encode() converts the JSON string to bytes (binary UTF-8). SHA256 requires bytes, not strings.
        return hashlib.sha256(payload).hexdigest()
            # ^ hashlib.sha256() computes the SHA256 hash. hexdigest() returns it as readable 64-character hex string.
            # ^ This 64-character hex string is the "fingerprint" of this block.

    # End hash property: This property is the core of tamper-detection in blockchain systems.


def make_block(index: int, data: str, previous_hash: str) -> Block:
    # Factory function that creates a new Block instance and automatically sets timestamp to RIGHT NOW.
    # Type annotations: parameters are (int, str, str), returns a Block instance.
    # Why a factory function? Because we always want timestamp = current moment to avoid errors.
    # This keeps the main demo code clean and readable (just call make_block, not Block with manual time).
    return Block(index=index, timestamp=time(), data=data, previous_hash=previous_hash)
        # ^ Create and return a new Block instance with:
        # ^   - index: the provided block position number in the chain
        # ^   - timestamp: time() = current Unix timestamp (seconds since 1970)
        # ^   - data: the provided content string (what this block records)
        # ^   - previous_hash: the provided hash string (links to previous block in chain)


def main() -> None:
    # Main function: orchestrates the entire blockchain demo.
    # Returns: None (no return value, just performs actions like printing).
    print("Lab 1 Python demo: hash -> block -> chain\n")
      # ^ Print header message. \n = newline character (adds blank line for readability).

    # The genesis block is the first block in the chain.
    # Because nothing comes before it, we use a fake previous hash of 64 zeros.
    genesis = make_block(0, "Genesis block for Ahmed's class", "0" * 64)
      # ^ Create block #0 (the first block):
      # ^   - index = 0 (first block)
      # ^   - data = "Genesis block for Ahmed's class"
      # ^   - previous_hash = "0000000000000000000000000000000000000000000000000000000000000000" (64 zeros)
      # ^   - timestamp = automatically set to current moment

    # Each block stores the hash of the PREVIOUS block.
    # This creates the chain structure - each block points back to the one before it.
    second = make_block(1, "Person Alice earns a certificate", genesis.hash)
      # ^ Create block #1 (second block):
      # ^   - index = 1 (second block)
      # ^   - data = "Person Alice earns a certificate"
      # ^   - previous_hash = genesis.hash (links to the first block's fingerprint)
      # ^   - This link is how the chain grows and becomes connected.

    third = make_block(2, "Person Bob verifies the certificate", second.hash)
      # ^ Create block #2 (third block):
      # ^   - index = 2 (third block)
      # ^   - data = "Person Bob verifies the certificate"
      # ^   - previous_hash = second.hash (links to the second block's fingerprint)
      # ^   - Now we have: genesis -> second -> third (a chain of 3 blocks)

    chain = [genesis, second, third]
      # ^ Create a Python list containing all three blocks (stores references, not copies).

    # Print the full blockchain so students can inspect data and see the chain structure.
    for block in chain:
      # ^ Loop: iterate through each block in the chain, processing one at a time.
        print(f"Block #{block.index}")
          # ^ Print the block's position in the chain (0, then 1, then 2).
        print(f"  Data          : {block.data}")
          # ^ Print the data stored in this block (content is indented for visual clarity).
        print(f"  Previous hash : {block.previous_hash}")
          # ^ Print the hash of the PREVIOUS block (or "0000..." for genesis block).
        print(f"  Current hash  : {block.hash}\n")
          # ^ Print THIS block's own hash (its fingerprint). \n creates blank line after each block.

    # Now simulate tampering by creating a modified version of the second block.
    # We keep the same timestamp and previous_hash, but change ONLY the data.
    # This demonstrates that even tiny changes create completely different hashes.
    tampered = Block(
        # ^ Create a NEW Block instance with MODIFIED data (simulating criminal tampering).
        index=1,
          # ^ Same index as the original block (still in position 1).
        timestamp=second.timestamp,
          # ^ SAME timestamp as the original (so timestamp isn't what changed).
        data="Person Alice earns a fake certificate",
          # ^ CHANGED data: added the word "fake" to simulate tampering/fraud.
        previous_hash=genesis.hash,
          # ^ SAME previous_hash as original (still points to genesis block).
    )
      # ^ By changing ONLY the data field, we can demonstrate how sensitive hashes are to changes.

    # Compare the original and tampered hashes to prove tampering is detectable.
    # This prevents fraud - anyone can verify the blockchain by checking hashes match.
    print("Tamper check")
      # ^ Print header for the tampering demonstration section.
    print(f"  Original hash : {second.hash}")
      # ^ Print the hash of the original, legitimate block (before tampering).
    print(f"  Tampered hash : {tampered.hash}")
      # ^ Print the hash of the block with "fake" added to data.
      # ^ WARNING: This hash is COMPLETELY DIFFERENT from original! This is the avalanche effect.
    print(f"  Match?        : {second.hash == tampered.hash}")
      # ^ Print True/False: do the hashes match? Answer: False!
      # ^ This proves tampering is DETECTABLE - hash mismatch immediately reveals the crime.
      # ^ This is why blockchain is immutable in practice - tamper with one block = breaks all hashes after it.


if __name__ == "__main__":
    # Special Python idiom: execute code below ONLY if this file is run directly as main program.
    # If this file is imported from another Python script, this code block is skipped.
    # __name__ is automatically set to "__main__" only for the main executed program.
    # This allows the file to be BOTH:
    # 1. Executable script (run directly with: python blockchain_demo.py)
    # 2. Importable library (import as: from blockchain_demo import Block)
    main()
      # ^ Call the main() function to run the entire blockchain teaching demo.
