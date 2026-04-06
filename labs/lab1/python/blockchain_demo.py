import hashlib
import json
from dataclasses import dataclass
from time import time


@dataclass
class Block:
    index: int
    timestamp: float
    data: str
    previous_hash: str

    @property
    def hash(self) -> str:
        payload = json.dumps(
            {
                "index": self.index,
                "timestamp": self.timestamp,
                "data": self.data,
                "previous_hash": self.previous_hash,
            },
            sort_keys=True,
        ).encode()
        return hashlib.sha256(payload).hexdigest()


def make_block(index: int, data: str, previous_hash: str) -> Block:
    return Block(index=index, timestamp=time(), data=data, previous_hash=previous_hash)


def main() -> None:
    print("Lab 1 Python demo: hash -> block -> chain\n")

    genesis = make_block(0, "Genesis block for Ahmed's class", "0" * 64)
    second = make_block(1, "Person Alice earns a certificate", genesis.hash)
    third = make_block(2, "Person Bob verifies the certificate", second.hash)

    chain = [genesis, second, third]

    for block in chain:
        print(f"Block #{block.index}")
        print(f"  Data          : {block.data}")
        print(f"  Previous hash : {block.previous_hash}")
        print(f"  Current hash  : {block.hash}\n")

    tampered = Block(
        index=1,
        timestamp=second.timestamp,
        data="Person Alice earns a fake certificate",
        previous_hash=genesis.hash,
    )

    print("Tamper check")
    print(f"  Original hash : {second.hash}")
    print(f"  Tampered hash : {tampered.hash}")
    print(f"  Match?        : {second.hash == tampered.hash}")


if __name__ == "__main__":
    main()
