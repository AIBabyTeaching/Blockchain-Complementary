"""
Lab 5: Blockchain Proof Mechanisms Using Multicore Simulated Nodes

Objective:
- Multiple blockchain nodes are simulated.
- Each node is represented as a separate Python process.
- Each process may run on a different CPU core.
- Proof of Work is shown as a mining race.
- The other proofs are shown as independent node verification/agreement.

Important:
This is an educational simulation, not a real distributed blockchain network.
"""

import hashlib
import multiprocessing as mp
import os
import time


# ==================================================
# Helper Function 1: SHA-256 Hash
# ==================================================
def h(text):
    """
    Purpose:
    A SHA-256 hash is created from input text.

    Parameters:
    text:
        The input data that should be hashed.

    Returns:
    A 64-character hexadecimal SHA-256 hash.

    Used by:
    - Proof of Work
    - Proof of Stake through num()
    - Proof of Capacity through num()
    - Proof of History
    """

    return hashlib.sha256(text.encode()).hexdigest()


# ==================================================
# Helper Function 2: Hash to Number
# ==================================================
def num(text, mod):
    """
    Purpose:
    A hash is converted into a number within a specific range.

    Parameters:
    text:
        The input text that should be hashed.

    mod:
        The modulus value. The output number will be between 0 and mod - 1.

    Returns:
    An integer generated from the SHA-256 hash.

    Example:
    num("block 1", 100)
    This returns a number between 0 and 99.

    Used by:
    - Proof of Stake to create a stake-selection ticket.
    - Proof of Capacity to create storage-slot scores.
    """

    return int(h(text), 16) % mod


# ==================================================
# Helper Function 3: Pin Process to CPU Core
# ==================================================
def pin_to_core(node_id):
    """
    Purpose:
    A simulated blockchain node process is assigned to a CPU core if possible.

    Parameters:
    node_id:
        The ID of the simulated blockchain node.

    Returns:
    - A CPU core number if psutil is installed and CPU affinity is supported.
    - "OS scheduled" if the operating system manages the process automatically.

    Notes:
    - psutil is optional.
    - If psutil is not installed, the code still works.
    - The operating system will decide which core should run each process.
    """

    try:
        import psutil

        # The current Python process is selected.
        p = psutil.Process(os.getpid())

        # The list of available CPU cores is retrieved.
        cores = p.cpu_affinity()

        # A core is selected based on node_id.
        core = cores[node_id % len(cores)]

        # The current process is pinned to the selected core.
        p.cpu_affinity([core])

        return core

    except Exception:
        return "OS scheduled"


# ==================================================
# 1) Proof of Work - Worker Node
# ==================================================
def pow_node(node_id, total_nodes, data, difficulty, stop, queue):
    """
    Purpose:
    One Proof-of-Work mining node is simulated.

    This function represents ONE blockchain node.

    Parameters:
    node_id:
        The ID of the current node.

    total_nodes:
        The total number of simulated blockchain nodes.

    data:
        The block data that should be mined.

    difficulty:
        The required hash prefix.
        Example: "00000" means the hash must start with five zeros.

    stop:
        A shared multiprocessing Event.
        It is used to stop all mining nodes after one node finds a valid proof.

    queue:
        A multiprocessing Queue.
        It is used to send the winning mining result back to the parent process.

    What happens:
    - Each node starts from a different nonce.
    - Each node hashes data + nonce.
    - If the hash satisfies the difficulty, that node wins.
    - The winning node sends the result to the queue.

    Important:
    This is the only proof in this file where real CPU competition is meaningful.
    """

    # The process is optionally pinned to a CPU core.
    core = pin_to_core(node_id)

    # Each node starts from its own node_id.
    # Example:
    # Node 0 starts from nonce 0.
    # Node 1 starts from nonce 1.
    # Node 2 starts from nonce 2.
    nonce = node_id

    # The number of hashes tried by this node is counted.
    attempts = 0

    # Mining continues until another node has already found the answer.
    while not stop.is_set():

        # A candidate block hash is calculated.
        block_hash = h(data + str(nonce))

        # One mining attempt has been completed.
        attempts += 1

        # The proof is accepted only if the hash starts with the difficulty prefix.
        if block_hash.startswith(difficulty):

            # All other mining nodes are told to stop.
            stop.set()

            # The winning proof is sent back to the parent process.
            queue.put({
                "proof": "PoW",
                "winner_node": node_id,
                "core": core,
                "nonce": nonce,
                "hash": block_hash,
                "attempts": attempts,
                "verified": block_hash.startswith(difficulty)
            })

            return

        # The nonce space is divided between nodes.
        # Example with 4 nodes:
        # Node 0 checks 0, 4, 8, 12...
        # Node 1 checks 1, 5, 9, 13...
        # Node 2 checks 2, 6, 10, 14...
        # Node 3 checks 3, 7, 11, 15...
        nonce += total_nodes


# ==================================================
# 1) Proof of Work - Parent Function
# ==================================================
def proof_of_work(nodes):
    """
    Purpose:
    Multiple Proof-of-Work mining nodes are started.

    Parameters:
    nodes:
        The number of simulated blockchain nodes.

    What happens:
    - A process is created for each node.
    - All nodes mine in parallel.
    - The first node that finds a valid nonce wins.
    - Other nodes are terminated after a winner is found.
    """

    print("\n=== Proof of Work ===")

    # The block data to be mined is defined.
    data = "block data"

    # The difficulty rule is defined.
    # The mined hash must start with this prefix.
    difficulty = "00000"

    # A shared stop signal is created.
    stop = mp.Event()

    # A queue is created to receive the winning result.
    queue = mp.Queue()

    # Process objects will be stored here.
    processes = []

    # One process is created for each simulated node.
    for node_id in range(nodes):
        p = mp.Process(
            target=pow_node,
            args=(node_id, nodes, data, difficulty, stop, queue)
        )

        processes.append(p)
        p.start()

    # The first valid mining result is received.
    result = queue.get()

    # All remaining mining processes are stopped.
    for p in processes:
        p.terminate()
        p.join()

    print(result)


# ==================================================
# 2) Proof of Stake - Worker Node
# ==================================================
def pos_node(node_id, validators, queue):
    """
    Purpose:
    One node independently calculates the Proof-of-Stake winner.

    Parameters:
    node_id:
        The ID of the current simulated node.

    validators:
        A dictionary containing validator names and their stake values.

    queue:
        A multiprocessing Queue used to send the result back.

    What happens:
    - The total stake is calculated.
    - A deterministic ticket is generated.
    - The ticket is matched to a stake range.
    - The selected validator becomes the stake winner.

    Meaning:
    A higher stake gives a larger selection range.
    """

    core = pin_to_core(node_id)

    # The total stake of all validators is calculated.
    total_stake = sum(validators.values())

    # A deterministic ticket is generated from the block name and total stake.
    ticket = num("block 1", total_stake)

    current = 0
    winner = None

    # The ticket is checked against cumulative stake ranges.
    for name, stake in validators.items():
        current += stake

        if ticket < current:
            winner = name
            break

    queue.put({
        "proof": "PoS",
        "node": node_id,
        "core": core,
        "ticket": ticket,
        "winner": winner,
        "verified": winner in validators
    })


# ==================================================
# 2) Proof of Stake - Parent Function
# ==================================================
def proof_of_stake(nodes):
    """
    Purpose:
    Multiple nodes are started so that each node can independently agree
    on the same Proof-of-Stake winner.

    Parameters:
    nodes:
        Number of simulated blockchain nodes.

    Meaning:
    PoS is not a mining race.
    The winner is selected by stake weight.
    """

    print("\n=== Proof of Stake ===")

    validators = {
        "Node_0": 10,
        "Node_1": 30,
        "Node_2": 60
    }

    queue = mp.Queue()
    processes = []

    for node_id in range(nodes):
        p = mp.Process(target=pos_node, args=(node_id, validators, queue))
        processes.append(p)
        p.start()

    results = [queue.get() for _ in range(nodes)]

    for p in processes:
        p.join()

    for r in sorted(results, key=lambda x: x["node"]):
        print(r)


# ==================================================
# 3) Proof of Authority - Worker Node
# ==================================================
def poa_node(node_id, authorities, selected_validator, queue):
    """
    Purpose:
    One node checks whether the selected validator is trusted.

    Parameters:
    node_id:
        The ID of the current simulated node.

    authorities:
        A list of approved validator identities.

    selected_validator:
        The validator being checked.

    queue:
        A multiprocessing Queue used to send the result back.

    Meaning:
    In Proof of Authority, identity is the proof.
    A validator is accepted only if it is included in the authority list.
    """

    core = pin_to_core(node_id)

    queue.put({
        "proof": "PoA",
        "node": node_id,
        "core": core,
        "selected_validator": selected_validator,
        "verified": selected_validator in authorities
    })


# ==================================================
# 3) Proof of Authority - Parent Function
# ==================================================
def proof_of_authority(nodes):
    """
    Purpose:
    Multiple nodes are started to verify the same authority decision.

    Parameters:
    nodes:
        Number of simulated blockchain nodes.

    Meaning:
    Every node checks the same trusted validator list.
    """

    print("\n=== Proof of Authority ===")

    authorities = ["Node_0", "Node_1"]
    selected_validator = "Node_0"

    queue = mp.Queue()
    processes = []

    for node_id in range(nodes):
        p = mp.Process(
            target=poa_node,
            args=(node_id, authorities, selected_validator, queue)
        )

        processes.append(p)
        p.start()

    results = [queue.get() for _ in range(nodes)]

    for p in processes:
        p.join()

    for r in sorted(results, key=lambda x: x["node"]):
        print(r)


# ==================================================
# 4) Proof of Capacity - Worker Node
# ==================================================
def poc_node(node_id, capacity, challenge, queue):
    """
    Purpose:
    One node simulates a Proof-of-Capacity storage check.

    Parameters:
    node_id:
        The ID of the current node.

    capacity:
        The number of simulated storage slots owned by the node.

    challenge:
        The challenge string that every node must answer.

    queue:
        A multiprocessing Queue used to send the result back.

    What happens:
    - The node checks all of its storage slots.
    - A score is generated for each slot.
    - The best score is selected.
    - The node returns its best slot and best score.

    Meaning:
    A node with more capacity has more chances to find a strong score.
    """

    core = pin_to_core(node_id)

    best_slot = None
    best_score = 10**18

    for slot in range(capacity):
        score = num(str(node_id) + challenge + str(slot), 10**9)

        if score < best_score:
            best_score = score
            best_slot = slot

    queue.put({
        "proof": "PoC",
        "node": node_id,
        "core": core,
        "capacity": capacity,
        "best_slot": best_slot,
        "best_score": best_score,
        "verified": best_slot < capacity
    })


# ==================================================
# 4) Proof of Capacity - Parent Function
# ==================================================
def proof_of_capacity(nodes):
    """
    Purpose:
    Multiple Proof-of-Capacity nodes are started.

    Parameters:
    nodes:
        Number of simulated blockchain nodes.

    What happens:
    - Each node receives a different storage capacity.
    - Each node submits its best storage-slot score.
    - The node with the lowest score wins.
    """

    print("\n=== Proof of Capacity ===")

    challenge = "storage challenge"

    queue = mp.Queue()
    processes = []

    for node_id in range(nodes):
        capacity = (node_id + 1) * 10

        p = mp.Process(
            target=poc_node,
            args=(node_id, capacity, challenge, queue)
        )

        processes.append(p)
        p.start()

    results = [queue.get() for _ in range(nodes)]

    for p in processes:
        p.join()

    winner = min(results, key=lambda x: x["best_score"])

    for r in sorted(results, key=lambda x: x["node"]):
        print(r)

    print("Winner:", winner)


# ==================================================
# 5) Proof of History - Chain Generator
# ==================================================
def make_poh_chain():
    """
    Purpose:
    A Proof-of-History hash chain is generated.

    Parameters:
    None.

    Returns:
    A list of hashes.

    What happens:
    - The chain starts from h("start").
    - Each next hash depends on the previous hash.
    - This creates a verifiable order.

    Meaning:
    If one step is changed, all following hashes become different.
    """

    hashes = []
    current = h("start")

    for i in range(1, 6):
        current = h(current + str(i))
        hashes.append(current)

    return hashes


# ==================================================
# 5) Proof of History - Worker Node
# ==================================================
def poh_node(node_id, hash_chain, queue):
    """
    Purpose:
    One node verifies the Proof-of-History chain.

    Parameters:
    node_id:
        The ID of the current simulated node.

    hash_chain:
        The hash chain that should be verified.

    queue:
        A multiprocessing Queue used to send the result back.

    What happens:
    - The node regenerates the hash chain from the beginning.
    - Each regenerated hash is compared with the given hash chain.
    - If all hashes match, the chain is verified.
    """

    core = pin_to_core(node_id)

    current = h("start")
    verified = True

    for i in range(1, 6):
        current = h(current + str(i))

        if current != hash_chain[i - 1]:
            verified = False

    queue.put({
        "proof": "PoH",
        "node": node_id,
        "core": core,
        "verified": verified
    })


# ==================================================
# 5) Proof of History - Parent Function
# ==================================================
def proof_of_history(nodes):
    """
    Purpose:
    Multiple nodes are started to verify the same Proof-of-History chain.

    Parameters:
    nodes:
        Number of simulated blockchain nodes.

    Meaning:
    All nodes should be able to verify the same event order.
    """

    print("\n=== Proof of History ===")

    hash_chain = make_poh_chain()

    queue = mp.Queue()
    processes = []

    for node_id in range(nodes):
        p = mp.Process(target=poh_node, args=(node_id, hash_chain, queue))
        processes.append(p)
        p.start()

    results = [queue.get() for _ in range(nodes)]

    for p in processes:
        p.join()

    print("Hash chain:", hash_chain)

    for r in sorted(results, key=lambda x: x["node"]):
        print(r)


# ==================================================
# 6) Proof of Importance - Worker Node
# ==================================================
def poi_node(node_id, users, queue):
    """
    Purpose:
    One node calculates Proof-of-Importance scores.

    Parameters:
    node_id:
        The ID of the current node.

    users:
        A dictionary containing stake and transaction activity.

    queue:
        A multiprocessing Queue used to send the result back.

    Formula:
    importance = stake + transactions * 2

    Meaning:
    Importance is based on both stake and activity.
    """

    core = pin_to_core(node_id)

    scores = {}

    for user, data in users.items():
        scores[user] = data["stake"] + data["transactions"] * 2

    winner = max(scores, key=scores.get)

    queue.put({
        "proof": "PoI",
        "node": node_id,
        "core": core,
        "scores": scores,
        "winner": winner,
        "verified": winner == max(scores, key=scores.get)
    })


# ==================================================
# 6) Proof of Importance - Parent Function
# ==================================================
def proof_of_importance(nodes):
    """
    Purpose:
    Multiple nodes are started to calculate the same importance winner.

    Parameters:
    nodes:
        Number of simulated blockchain nodes.

    Meaning:
    Every node should reach the same result from the same scoring formula.
    """

    print("\n=== Proof of Importance ===")

    users = {
        "Node_0": {"stake": 10, "transactions": 5},
        "Node_1": {"stake": 20, "transactions": 2},
        "Node_2": {"stake": 15, "transactions": 10}
    }

    queue = mp.Queue()
    processes = []

    for node_id in range(nodes):
        p = mp.Process(target=poi_node, args=(node_id, users, queue))
        processes.append(p)
        p.start()

    results = [queue.get() for _ in range(nodes)]

    for p in processes:
        p.join()

    for r in sorted(results, key=lambda x: x["node"]):
        print(r)


# ==================================================
# 7) Proof of Contribution - Worker Node
# ==================================================
def poco_node(node_id, contributions, queue):
    """
    Purpose:
    One node checks which participant has the highest contribution.

    Parameters:
    node_id:
        The ID of the current node.

    contributions:
        A dictionary containing contribution scores.

    queue:
        A multiprocessing Queue used to send the result back.

    Meaning:
    The node with the highest useful contribution is selected.
    """

    core = pin_to_core(node_id)

    winner = max(contributions, key=contributions.get)

    queue.put({
        "proof": "PoCo",
        "node": node_id,
        "core": core,
        "winner": winner,
        "verified": winner == max(contributions, key=contributions.get)
    })


# ==================================================
# 7) Proof of Contribution - Parent Function
# ==================================================
def proof_of_contribution(nodes):
    """
    Purpose:
    Multiple nodes are started to agree on the best contributor.

    Parameters:
    nodes:
        Number of simulated blockchain nodes.

    Meaning:
    Every node should select the same highest contribution score.
    """

    print("\n=== Proof of Contribution ===")

    contributions = {
        "Node_0": 3,
        "Node_1": 8,
        "Node_2": 5
    }

    queue = mp.Queue()
    processes = []

    for node_id in range(nodes):
        p = mp.Process(target=poco_node, args=(node_id, contributions, queue))
        processes.append(p)
        p.start()

    results = [queue.get() for _ in range(nodes)]

    for p in processes:
        p.join()

    for r in sorted(results, key=lambda x: x["node"]):
        print(r)


# ==================================================
# 8) Proof of Reputation - Worker Node
# ==================================================
def por_node(node_id, reputations, queue):
    """
    Purpose:
    One node checks which validator has the highest reputation.

    Parameters:
    node_id:
        The ID of the current node.

    reputations:
        A dictionary containing reputation scores.

    queue:
        A multiprocessing Queue used to send the result back.

    Meaning:
    The most trusted validator is selected.
    """

    core = pin_to_core(node_id)

    winner = max(reputations, key=reputations.get)

    queue.put({
        "proof": "PoR",
        "node": node_id,
        "core": core,
        "winner": winner,
        "verified": winner == max(reputations, key=reputations.get)
    })


# ==================================================
# 8) Proof of Reputation - Parent Function
# ==================================================
def proof_of_reputation(nodes):
    """
    Purpose:
    Multiple nodes are started to agree on the best reputation score.

    Parameters:
    nodes:
        Number of simulated blockchain nodes.

    Meaning:
    Every node should select the same validator with the highest reputation.
    """

    print("\n=== Proof of Reputation ===")

    reputations = {
        "Node_0": 70,
        "Node_1": 95,
        "Node_2": 40
    }

    queue = mp.Queue()
    processes = []

    for node_id in range(nodes):
        p = mp.Process(target=por_node, args=(node_id, reputations, queue))
        processes.append(p)
        p.start()

    results = [queue.get() for _ in range(nodes)]

    for p in processes:
        p.join()

    for r in sorted(results, key=lambda x: x["node"]):
        print(r)


# ==================================================
# Main Program
# ==================================================
if __name__ == "__main__":
    """
    Purpose:
    The full lab simulation is started here.

    What happens:
    - CPU cores are detected.
    - A number of blockchain nodes is selected.
    - Each proof mechanism is executed.
    - Total execution time is printed.

    Important:
    The if __name__ == "__main__" block is required for multiprocessing,
    especially on Windows.
    """

    cpu_cores = os.cpu_count()

    # At most 4 nodes are used so that the output remains readable.
    nodes = min(cpu_cores, 4)

    print("CPU cores detected:", cpu_cores)
    print("Blockchain nodes simulated:", nodes)

    start = time.time()

    proof_of_work(nodes)
    proof_of_stake(nodes)
    proof_of_authority(nodes)
    proof_of_capacity(nodes)
    proof_of_history(nodes)
    proof_of_importance(nodes)
    proof_of_contribution(nodes)
    proof_of_reputation(nodes)

    print("\nTotal time:", round(time.time() - start, 4), "seconds")