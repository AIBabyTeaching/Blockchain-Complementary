// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// CertificateRegistry turns the voting contract pattern from Lab 3 into a
// domain registry: one trusted issuer records certificate hashes, then anyone
// can verify whether a presented certificate is authentic and still valid.
contract CertificateRegistry {
    struct Certificate {
        string studentId;
        string studentName;
        string courseName;
        string grade;
        uint256 issuedAt;
        uint256 revokedAt;
        bool exists;
        bool revoked;
    }

    address public immutable issuer;
    uint256 public certificateCount;
    uint256 public revokedCount;

    mapping(bytes32 => Certificate) private certificates;

    event CertificateIssued(
        bytes32 indexed certificateHash,
        string studentId,
        string studentName,
        string courseName,
        address indexed issuer
    );

    event CertificateRevoked(
        bytes32 indexed certificateHash,
        string reason,
        address indexed issuer
    );

    modifier onlyIssuer() {
        require(msg.sender == issuer, "Only issuer can perform this action.");
        _;
    }

    constructor() {
        issuer = msg.sender;
    }

    function computeCertificateHash(
        string memory studentId,
        string memory studentName,
        string memory courseName,
        string memory grade
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(studentId, "|", studentName, "|", courseName, "|", grade));
    }

    function issueCertificate(
        bytes32 certificateHash,
        string calldata studentId,
        string calldata studentName,
        string calldata courseName,
        string calldata grade
    ) external onlyIssuer {
        require(certificateHash != bytes32(0), "Certificate hash is required.");
        require(bytes(studentId).length > 0, "Student ID is required.");
        require(bytes(studentName).length > 0, "Student name is required.");
        require(bytes(courseName).length > 0, "Course name is required.");
        require(bytes(grade).length > 0, "Grade is required.");
        require(!certificates[certificateHash].exists, "Certificate already exists.");

        certificates[certificateHash] = Certificate({
            studentId: studentId,
            studentName: studentName,
            courseName: courseName,
            grade: grade,
            issuedAt: block.timestamp,
            revokedAt: 0,
            exists: true,
            revoked: false
        });

        certificateCount += 1;

        emit CertificateIssued(certificateHash, studentId, studentName, courseName, msg.sender);
    }

    function revokeCertificate(
        bytes32 certificateHash,
        string calldata reason
    ) external onlyIssuer {
        Certificate storage certificate = certificates[certificateHash];

        require(certificate.exists, "Certificate not found.");
        require(!certificate.revoked, "Certificate already revoked.");
        require(bytes(reason).length > 0, "Revocation reason is required.");

        certificate.revoked = true;
        certificate.revokedAt = block.timestamp;
        revokedCount += 1;

        emit CertificateRevoked(certificateHash, reason, msg.sender);
    }

    function verifyCertificate(
        bytes32 certificateHash
    )
        external
        view
        returns (
            bool exists,
            bool valid,
            bool revoked,
            uint256 issuedAt,
            uint256 revokedAt
        )
    {
        Certificate storage certificate = certificates[certificateHash];
        if (!certificate.exists) {
            return (false, false, false, 0, 0);
        }

        return (
            true,
            !certificate.revoked,
            certificate.revoked,
            certificate.issuedAt,
            certificate.revokedAt
        );
    }

    function getCertificate(
        bytes32 certificateHash
    )
        external
        view
        returns (
            string memory studentId,
            string memory studentName,
            string memory courseName,
            string memory grade,
            uint256 issuedAt,
            uint256 revokedAt,
            bool revoked
        )
    {
        Certificate storage certificate = certificates[certificateHash];
        require(certificate.exists, "Certificate not found.");

        return (
            certificate.studentId,
            certificate.studentName,
            certificate.courseName,
            certificate.grade,
            certificate.issuedAt,
            certificate.revokedAt,
            certificate.revoked
        );
    }
}
