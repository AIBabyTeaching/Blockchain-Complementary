// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ClassroomVoting is the first full contract-focused lab after account basics.
// It deliberately keeps the model small and visible:
// - one organizer deploys the election
// - a fixed list of proposals is created at deployment time
// - each address can vote once
// - voting stops after the deadline
// - events let the API/frontend reconstruct a classroom-friendly history
contract ClassroomVoting {
    struct Proposal {
        string name;
        uint256 voteCount;
    }

    address public immutable organizer;
    string public electionTitle;
    uint256 public immutable votingDeadline;
    uint256 public votersParticipated;

    Proposal[] private proposals;

    // We store proposalIndex + 1 so zero still means "not voted yet".
    mapping(address => uint256) private recordedVoteIndexPlusOne;

    event ProposalCreated(uint256 indexed proposalIndex, string name);
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalIndex,
        string proposalName,
        uint256 newVoteCount
    );

    constructor(
        string memory title_,
        string[] memory proposalNames_,
        uint256 durationSeconds_
    ) {
        require(bytes(title_).length > 0, "Election title is required.");
        require(proposalNames_.length >= 2, "At least two proposals are required.");
        require(durationSeconds_ > 0, "Voting duration must be positive.");

        organizer = msg.sender;
        electionTitle = title_;
        votingDeadline = block.timestamp + durationSeconds_;

        for (uint256 index = 0; index < proposalNames_.length; index += 1) {
            require(
                bytes(proposalNames_[index]).length > 0,
                "Proposal names cannot be empty."
            );

            proposals.push(
                Proposal({
                    name: proposalNames_[index],
                    voteCount: 0
                })
            );

            emit ProposalCreated(index, proposalNames_[index]);
        }
    }

    modifier onlyBeforeDeadline() {
        require(block.timestamp < votingDeadline, "Voting has already ended.");
        _;
    }

    function proposalCount() external view returns (uint256) {
        return proposals.length;
    }

    function isVotingOpen() public view returns (bool) {
        return block.timestamp < votingDeadline;
    }

    function remainingSeconds() external view returns (uint256) {
        if (block.timestamp >= votingDeadline) {
            return 0;
        }

        return votingDeadline - block.timestamp;
    }

    function hasVoted(address voter) public view returns (bool) {
        return recordedVoteIndexPlusOne[voter] != 0;
    }

    function voteInfo(address voter) external view returns (bool voted, uint256 proposalIndex) {
        uint256 storedValue = recordedVoteIndexPlusOne[voter];
        if (storedValue == 0) {
            return (false, 0);
        }

        return (true, storedValue - 1);
    }

    function getProposal(
        uint256 proposalIndex
    ) external view returns (string memory name, uint256 voteCount) {
        require(proposalIndex < proposals.length, "Invalid proposal index.");

        Proposal storage proposal = proposals[proposalIndex];
        return (proposal.name, proposal.voteCount);
    }

    function currentLeader()
        external
        view
        returns (uint256 leaderIndex, string memory name, uint256 voteCount)
    {
        require(proposals.length > 0, "No proposals exist.");

        uint256 winningIndex = 0;
        uint256 highestVoteCount = proposals[0].voteCount;

        for (uint256 index = 1; index < proposals.length; index += 1) {
            if (proposals[index].voteCount > highestVoteCount) {
                highestVoteCount = proposals[index].voteCount;
                winningIndex = index;
            }
        }

        Proposal storage leader = proposals[winningIndex];
        return (winningIndex, leader.name, leader.voteCount);
    }

    function vote(uint256 proposalIndex) external onlyBeforeDeadline {
        require(proposalIndex < proposals.length, "Invalid proposal index.");
        require(!hasVoted(msg.sender), "This address has already voted.");

        recordedVoteIndexPlusOne[msg.sender] = proposalIndex + 1;
        votersParticipated += 1;
        proposals[proposalIndex].voteCount += 1;

        emit VoteCast(
            msg.sender,
            proposalIndex,
            proposals[proposalIndex].name,
            proposals[proposalIndex].voteCount
        );
    }
}
