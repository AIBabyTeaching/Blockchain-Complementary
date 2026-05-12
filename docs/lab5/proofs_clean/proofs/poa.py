# poa_node() and proof_of_authority()
from common import pin_to_core
import multiprocessing as mp

# Worker Node
def poa_node(node_id,
             authorities,
             selected_validator,
             queue):
    """
    On Purpose: One node checks whether the selected validator is trusted.
    
    Params:
    - node_id
    - authorities: A set of trusted authority names.
    - selected_validators: A list of selected validators to check against.
    - queue: A multiprocessing queue used to send the result back.
    
    Meaning: PoA relies on a set of trusted authorities to validate transactions. The selected validator must be among the trusted authorities for the proof to be valid.
    """
    
    core = pin_to_core(node_id) # Pin the process to a specific CPU core for better performance (MP)
    
    queue.put({
        "proof": "PoA",
        "node": node_id,
        "core": core,
        "selected_validator": selected_validator,
        "verified": selected_validator in authorities
    })
    
    
def proof_of_authority(nodes):
    """
    On Purpose: Multiple nodes are started to verify same decision
    
    Params:
    - nodes: Number of simulated blockchain nodes.
    
    Meaning: Every node checks same trusted validator list.
    """
    
    print("\n=== Proof of Authority ===")
    
    authorities = {"Node_0", "Node_1"} # A set of trusted authorities
    
    selected_validator = "Node_0" # The validator selected for this round (could be dynamic)
    
    queue = mp.Queue() # Create a queue to collect results from nodes
    
    processes = []
    
    for node_id in range(nodes):
        p = mp.Process(
            target=poa_node,
            args=(node_id,
                  authorities,
                  selected_validator,
                  queue)
        )
        processes.append(p)
        
        p.start()
        
    results = [queue.get() for _ in range(nodes)]
    
    for p in processes:
        p.join() # Wait for all processes to finish
        
    for r in sorted(results, key=lambda x: x["node"]): # sort keys
        print(r)