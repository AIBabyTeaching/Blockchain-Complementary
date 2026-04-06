// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// This contract is the smallest possible example of on-chain shared state.
// It exists to see three core ideas:
// 1. Blockchain can store values, not just coins.
// 2. A function can update state through a transaction.
// 3. Another function can read the current stored state.
contract SimpleStorage {
    // These values live on chain inside the contract state.
    // They are marked private so other contracts cannot read them directly;
    // instead, users interact through the functions below.
    uint256 private favoriteNumber;
    string private lessonMessage;

    // This event is emitted whenever state changes.
    // Events are useful because they create a visible log entry that tools can watch.
    event NumberUpdated(uint256 newValue, string message);

    // The constructor runs once, exactly at deployment time.
    // Think of it as the contract's initial setup step.
    constructor() {
        favoriteNumber = 7;
        lessonMessage = "Blockchain stores agreed state.";
    }
    // End constructor: the contract now has a default value before any user interacts with it.

    // This is the write function.
    // Calling it creates a transaction because it changes on-chain state.
    // The API uses this function when the frontend submits a new number and message.
    function store(uint256 newValue, string calldata newMessage) external {
        favoriteNumber = newValue;
        lessonMessage = newMessage;
        emit NumberUpdated(newValue, newMessage);
    }
    // End store: state is updated and an event is emitted for observers.

    // This is the read function.
    // It is marked view because it does not change anything on chain.
    // The frontend/API call this to display the current stored values.
    function retrieve() external view returns (uint256, string memory) {
        return (favoriteNumber, lessonMessage);
    }
    // End retrieve: returns the current contract state without creating a transaction.
}
