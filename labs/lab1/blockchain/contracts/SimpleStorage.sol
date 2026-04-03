// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SimpleStorage {
    uint256 private favoriteNumber;
    string private lessonMessage;

    event NumberUpdated(uint256 newValue, string message);

    constructor() {
        favoriteNumber = 7;
        lessonMessage = "Blockchain stores agreed state.";
    }

    function store(uint256 newValue, string calldata newMessage) external {
        favoriteNumber = newValue;
        lessonMessage = newMessage;
        emit NumberUpdated(newValue, newMessage);
    }

    function retrieve() external view returns (uint256, string memory) {
        return (favoriteNumber, lessonMessage);
    }
}
