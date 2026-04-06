// SPDX-License-Identifier: MIT
  // ^ License identifier ensures this contract code can be freely reused in compatible projects.
pragma solidity ^0.8.24;
  // ^ "pragma" tells the compiler which Solidity version to use; ^0.8.24 means "0.8.24 or later but not 0.9.0".

// This contract is the smallest possible example of on-chain shared state.
// It exists to see three core ideas:
// 1. Blockchain can store values, not just coins.
// 2. A function can update state through a transaction.
// 3. Another function can read the current stored state.
contract SimpleStorage {
  // "contract" is like "class" in other languages. It defines a new unit of code that lives on chain.
  
    // These values live on chain inside the contract state.
    // They are marked private so other contracts cannot read them directly;
    // instead, users interact through the functions below.
    uint256 private favoriteNumber;
      // ^ "uint256" = unsigned integer, holds numbers 0 to 2^256-1. Every variable stored on chain costs gas (money).
      // ^ "private" means only functions INSIDE this contract can read it. External callers must use getter functions.
    string private lessonMessage;
      // ^ "string" = variable-length text. Also stored on chain with a cost based on length.

    // This event is emitted whenever state changes.
    // Events are useful because they create a visible log entry that tools can watch.
    event NumberUpdated(uint256 newValue, string message);
      // ^ "event" declares what info gets broadcast when something important happens. Events don't cost much gas.

    // The constructor runs once, exactly at deployment time.
    // Think of it as the contract's initial setup step.
    constructor() {
      // ^ "constructor" is a special function that runs ONLY when the contract is first deployed to the chain.
        favoriteNumber = 7;
          // ^ Set the default favorite number to 7. This initial write happens during deployment.
        lessonMessage = "Blockchain stores agreed state.";
          // ^ Set the default message. Both state writes are permanent once deployment completes.
    }
    // End constructor: the contract now has a default value before any user interacts with it.

    // This is the write function.
    // Calling it creates a transaction because it changes on-chain state.
    // The API uses this function when the frontend submits a new number and message.
    function store(uint256 newValue, string calldata newMessage) external {
      // ^ "function store" declares a new public action. "string calldata" means the input is read-only memory.
      // ^ "external" means outside wallets (or the API) can call this function. It costs gas to run.
        favoriteNumber = newValue;
          // ^ Update the stored number. Because this changes chain state, it requires a transaction to be mined.
        lessonMessage = newMessage;
          // ^ Update the stored message. Again, this is a state change that becomes permanent once mined.
        emit NumberUpdated(newValue, newMessage);
          // ^ Broadcast an event to the blockchain event log. Tools monitoring the chain can see this happened.
    }
    // End store: state is updated and an event is emitted for observers.

    // This is the read function.
    // It is marked view because it does not change anything on chain.
    // The frontend/API call this to display the current stored values.
    function retrieve() external view returns (uint256, string memory) {
      // ^ "view" means this function reads chain state but NEVER modifies it. It costs no gas.
      // ^ "returns (uint256, string memory)" means it sends back TWO values: the number and the message.
        return (favoriteNumber, lessonMessage);
          // ^ Return both stored values. Multiple returns are returned as a tuple (two values in one operation).
    }
    // End retrieve: returns the current contract state without creating a transaction.
}
