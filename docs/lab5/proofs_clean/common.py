# Shared helpers: h(), num(), pin_to_core()

import hashlib # for hashing
import os # for pinning to core (MP)

def h(text):
    """Hash the given text using 'SHA-256' and return the hexadecimal digest."""
    return hashlib.sha256(text.encode()).hexdigest() # hexdigest() returns a string of hexadecimal digits

def num(text, mod):
    """Convert the given text to a number and return it modulo 'mod'."""
    return int(h(text), 16) % mod # Convert the hexadecimal hash to an integer and take modulo  

def pin_to_core(core_id):
    """This helper will Pin the current process to the specified CPU core (core_id)."""
    try:
        import psutil # for pinning to core (MP)
        p = psutil.Process(os.getpid()) # Get the current process
        cores = p.cpu_affinity() # List all CPU cores available to the process
        core = cores[core_id % len(cores)] # Ensure core_id is within the range of available cores
        p.cpu_affinity([core]) # Pin the process to the specified core  
        return core # Return the core that the process is pinned to
    except Exception:
        return "OS scheduled"