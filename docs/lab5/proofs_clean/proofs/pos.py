# pos_node() and proof_of_stake()

import multiprocessing as mp

from common import num, pin_to_core


# WORKER NODE OF POS
def pos_node(node_id,
             validators,
             queue):
    
    """
    Purpose: One node independently calculates the Proof winner.
    
    Params:
    
    node_id: ID of node
    validators: A dict of validator names and their stakes (values)
    queue: A queue of multiprocessing used to send the result back to the main process.
    
    What will happen?:
    - Calculation of the total stake of all validators.
    - Generating a deterministic "ticket" number based on the block data and total stake.
    - Iterating through the validators and their stakes to determine the winner based on the ticket.
    - The selected validator will be the stake winner.
    
    Meaning >> A HIGHER STAKE GIVES A LARGER SELECTION RANGE.            
    """
    
    core = pin_to_core(node_id)
    
    total_stake = sum(validators.values()) # TOTAL VALIDATORS
    ticket = num("block 1", total_stake) # deterministic ticket generation from block name and total stake
    
    current = 0
    winner = None
    
    # THrough iteration, the ticket is being checked against the cumnulative range of stake.
    for name, stake in validators.items():
        current += stake
        
        if ticket < current:
            winner = name
            break
        
    queue.put({
        "proof": "PoS",
        "node" : node_id,
        "core": core,
        "ticket": ticket,
        "winner": winner,
        "verified": winner in validators
        }) # Send the result back to the main process through the queue
    
    
    
def proof_of_stake(nodes):
    """
    Purpose: Multiples nodes are started so each node can independently agreeo n the same Proof-of-Stake winner.
    
    Params:
    - Nodes: Number of simulated blockchain nodes.
    - Meaning: PoS is not a mining race. The winner is selected by stake weight.
    """
    
    print("\n=== PROOF OF STAKE ===")
    
    validators = {
        "Node_0": 10,
        "Node_1": 30,
        "Node_2": 60
    }
    
    queue = mp.Queue() # Create a mp queue to collect results from nodes
    
    processes = []
    
    for node_id in range(nodes):
        p = mp.Process(target=pos_node,
                       args=(node_id,
                             validators,
                             queue))
        processes.append(p)
        p.start() # Start the process for each node
        
    results = [queue.get() for _ in range(nodes)] # Collect results from the queue
    
    for p in processes:
        p.join() # Wait for all processes to finish
    
    for r in sorted(results, key=lambda x: x["node"]): # Sort results by node ID for consistent output
        print(r)    # Print the results
        