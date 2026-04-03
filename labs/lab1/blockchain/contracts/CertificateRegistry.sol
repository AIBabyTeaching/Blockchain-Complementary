// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CertificateRegistry {
    address public owner;

    struct Certificate {
        string studentId;
        string studentName;
        string courseName;
        string grade;
        uint256 issuedAt;
        bool exists;
    }

    mapping(bytes32 => Certificate) private certificates;

    event CertificateIssued(bytes32 indexed certificateHash, string studentId, string courseName);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can issue certificates");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function issueCertificate(
        bytes32 certificateHash,
        string calldata studentId,
        string calldata studentName,
        string calldata courseName,
        string calldata grade
    ) external onlyOwner {
        require(!certificates[certificateHash].exists, "Certificate already exists");

        certificates[certificateHash] = Certificate({
            studentId: studentId,
            studentName: studentName,
            courseName: courseName,
            grade: grade,
            issuedAt: block.timestamp,
            exists: true
        });

        emit CertificateIssued(certificateHash, studentId, courseName);
    }

    function verifyCertificate(bytes32 certificateHash) external view returns (Certificate memory) {
        require(certificates[certificateHash].exists, "Certificate not found");
        return certificates[certificateHash];
    }
}
