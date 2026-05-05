# Runs all proofs

import os
import time

from proofs.pos import proof_of_stake
# from proofs.pow import proof_of_work
# from proofs.poa import proof_of_autority
# from proofs.poc import proof_of_capacity
# from proofs.poi import proof_of_importance
# from proofs.poh import proof_of_history
# from proofs.poco import proof_of_contribution
# from proofs.por import proof_of_reputation

if __name__ == "__main__":
    cpu_cores = os.cpu_count() # Get the number of CPU cores
    cpu_limit = 8 # Set a limit for the number of nodes to run
    nodes = min(cpu_cores, cpu_limit) # Limit to a number
    
    print("CPU cores available:", cpu_cores)
    print("Let's run blockchain proofs", nodes)
    
    start = time.time() # start timer
    
    # proof_of_work(nodes)
    # proof_of_stake(nodes)
    # proof_of_autority(nodes)
    # proof_of_capacity(nodes)
    # proof_of_importance(nodes)
    # proof_of_history(nodes)     
    # proof_of_contribution(nodes)    
    # proof_of_reputation(nodes) # Runs all proofs
    
    proof_of_stake(nodes)
    
    end = time.time() # end timer               
    print("Total time taken:", end - start, "seconds")