import hashlib


def h(text):
    return hashlib.sha256(text.encode()).hexdigest()


def num(text, mod):
    return int(h(text), 16) % mod


# ==================================================
# 1) Proof of Work
# ==================================================
def proof_of_work():
    print("\n=== Proof of Work ===")

    data = "block data"
    difficulty = "0000"
    nonce = 0

    while True:
        block_hash = h(data + str(nonce))

        if block_hash.startswith(difficulty):
            break

        nonce += 1

    proof = {
        "data": data,
        "nonce": nonce,
        "hash": block_hash
    }

    verified = h(proof["data"] + str(proof["nonce"])).startswith(difficulty)

    print("Proof:", proof)
    print("Verified:", verified)


# ==================================================
# 2) Proof of Stake
# ==================================================
def proof_of_stake():
    print("\n=== Proof of Stake ===")

    validators = {
        "Alice": 10,
        "Bob": 30,
        "Charlie": 60
    }

    total_stake = sum(validators.values())
    ticket = num("block 1", total_stake)

    current = 0
    winner = None

    for name, stake in validators.items():
        current += stake

        if ticket < current:
            winner = name
            break

    proof = {
        "validators": validators,
        "total_stake": total_stake,
        "ticket": ticket,
        "winner": winner
    }

    verified = winner in validators

    print("Proof:", proof)
    print("Verified:", verified)


# ==================================================
# 3) Proof of Authority
# ==================================================
def proof_of_authority():
    print("\n=== Proof of Authority ===")

    authorities = ["Registrar", "Admin", "Academy_Node"]
    validator = "Registrar"

    proof = {
        "authorities": authorities,
        "validator": validator
    }

    verified = validator in authorities

    print("Proof:", proof)
    print("Verified:", verified)


# ==================================================
# 4) Proof of Capacity
# ==================================================
def proof_of_capacity():
    print("\n=== Proof of Capacity ===")

    miners = {
        "Miner_A": 5,
        "Miner_B": 20,
        "Miner_C": 50
    }

    challenge = "storage challenge"
    best_miner = None
    best_score = 10**18
    best_slot = None

    for miner, capacity in miners.items():
        for slot in range(capacity):
            score = num(miner + challenge + str(slot), 10**9)

            if score < best_score:
                best_score = score
                best_miner = miner
                best_slot = slot

    proof = {
        "challenge": challenge,
        "winner": best_miner,
        "slot": best_slot,
        "score": best_score
    }

    verified = best_miner in miners and best_slot < miners[best_miner]

    print("Proof:", proof)
    print("Verified:", verified)


# ==================================================
# 5) Proof of History
# ==================================================
def proof_of_history():
    print("\n=== Proof of History ===")

    start = "start"
    hashes = []

    current_hash = h(start)

    for i in range(1, 6):
        current_hash = h(current_hash + str(i))
        hashes.append(current_hash)

    proof = {
        "start": start,
        "hash_chain": hashes
    }

    check_hash = h(start)
    verified = True

    for i in range(1, 6):
        check_hash = h(check_hash + str(i))

        if check_hash != hashes[i - 1]:
            verified = False

    print("Proof:", proof)
    print("Verified:", verified)


# ==================================================
# 6) Proof of Importance
# ==================================================
def proof_of_importance():
    print("\n=== Proof of Importance ===")

    users = {
        "Alice": {"stake": 10, "transactions": 5},
        "Bob": {"stake": 20, "transactions": 2},
        "Charlie": {"stake": 15, "transactions": 10}
    }

    scores = {}

    for user, data in users.items():
        scores[user] = data["stake"] + data["transactions"] * 2

    winner = max(scores, key=scores.get)

    proof = {
        "users": users,
        "scores": scores,
        "winner": winner
    }

    verified = winner == max(scores, key=scores.get)

    print("Proof:", proof)
    print("Verified:", verified)


# ==================================================
# 7) Proof of Contribution
# ==================================================
def proof_of_contribution():
    print("\n=== Proof of Contribution ===")

    contributors = {
        "Node_A": 3,
        "Node_B": 8,
        "Node_C": 5
    }

    winner = max(contributors, key=contributors.get)

    proof = {
        "contributors": contributors,
        "winner": winner
    }

    verified = winner == max(contributors, key=contributors.get)

    print("Proof:", proof)
    print("Verified:", verified)


# ==================================================
# 8) Proof of Reputation
# ==================================================
def proof_of_reputation():
    print("\n=== Proof of Reputation ===")

    validators = {
        "Validator_A": 70,
        "Validator_B": 95,
        "Validator_C": 40
    }

    winner = max(validators, key=validators.get)

    proof = {
        "validators": validators,
        "winner": winner
    }

    verified = winner == max(validators, key=validators.get)

    print("Proof:", proof)
    print("Verified:", verified)


# ==================================================
# Run all proofs
# ==================================================
proof_of_work()
proof_of_stake()
proof_of_authority()
proof_of_capacity()
proof_of_history()
proof_of_importance()
proof_of_contribution()
proof_of_reputation()