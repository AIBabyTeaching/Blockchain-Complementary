// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// -----------------------------------------------------------------------------
// Lab 4 Contract Structure
// -----------------------------------------------------------------------------
// 1. Data model:
//    - Certificate struct describes the stored record for one certificate hash.
//    - certificates mapping stores hash -> certificate record.
//
// 2. Access model:
//    - issuer is the deployer account.
//    - onlyIssuer protects write operations.
//
// 3. Write operations:
//    - issueCertificate stores a new certificate hash.
//    - revokeCertificate marks an existing certificate as no longer valid.
//
// 4. Read operations:
//    - verifyCertificate returns exists/valid/revoked status.
//    - getCertificate returns full metadata for an existing hash.
//
// 5. Audit trail:
//    - CertificateIssued and CertificateRevoked events let the API/frontend
//      reconstruct classroom history.
// -----------------------------------------------------------------------------

// CertificateRegistry turns the voting contract pattern from Lab 3 into a
// domain registry: one trusted issuer records certificate hashes, then anyone
// can verify whether a presented certificate is authentic and still valid.
contract CertificateRegistry {
    // Certificate is the stored registry record for one certificate hash.
    // The raw certificate document is not stored here; only the useful metadata
    // and status flags needed for classroom verification are kept on-chain.
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

    // The deployer becomes the trusted issuer for this registry.
    // Immutable means this value is assigned once in the constructor and cannot
    // be changed later.
    address public immutable issuer;

    // Total number of unique certificate hashes issued by this registry.
    uint256 public certificateCount;

    // Number of issued certificates that were later marked as revoked.
    uint256 public revokedCount;

    // Main lookup table: certificate hash -> stored certificate record.
    // It is private so callers must use verification/getter functions.
    mapping(bytes32 => Certificate) private certificates;

    // Emitted after a new certificate hash is stored successfully.
    // Indexed fields make it easier for APIs and explorers to filter history.
    event CertificateIssued(
        bytes32 indexed certificateHash,
        string studentId,
        string studentName,
        string courseName,
        address indexed issuer
    );

    // Emitted after an existing certificate is marked as revoked.
    // The reason is stored in the event log for audit history, not in storage.
    event CertificateRevoked(
        bytes32 indexed certificateHash,
        string reason,
        address indexed issuer
    );

    // Access-control helper for issuer-only actions.
    // YOU should notice that the API also checks this, but the contract is
    // the real source of enforcement.
    modifier onlyIssuer() {
        require(msg.sender == issuer, "Only issuer can perform this action.");
        _;
    }

    // The account that deploys the contract becomes the issuer.
    constructor() {
        issuer = msg.sender;
    }

    // Builds the deterministic fingerprint for a certificate.
    // Same inputs in the same order produce the same bytes32 hash.
    function computeCertificateHash(
        string memory studentId,
        string memory studentName,
        string memory courseName,
        string memory grade
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(studentId, "|", studentName, "|", courseName, "|", grade));
    }

    // Stores a new certificate record.
    // This is a state-changing transaction, so the issuer pays gas and their
    // nonce increases on real Ethereum-like networks.
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

    // Marks an existing certificate as revoked without deleting the record.
    // Keeping the record is important because verification should still be able
    // to explain that the certificate once existed but is no longer valid.
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

    // Public read-only verification function.
    // It returns status flags instead of reverting for missing hashes so the UI
    // can display "not found" as a normal verification result.
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

    // Returns full certificate metadata for hashes that exist.
    // This function intentionally reverts when a hash is missing because callers
    // should verify existence first with verifyCertificate.
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
