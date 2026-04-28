const assert = require("node:assert/strict");

// -----------------------------------------------------------------------------
// Lab 4 Test File Structure
// -----------------------------------------------------------------------------
// 1. Shared sample data:
//    - one certificate payload is reused by each behavior test.
//
// 2. deployFixture:
//    - deploys a fresh CertificateRegistry for isolation.
//    - returns issuer, unauthorized account, and computed certificate hash.
//
// 3. Behavior tests:
//    - constructor sets issuer.
//    - issuer can issue and verify.
//    - duplicate hashes are rejected.
//    - non-issuer writes are rejected.
//    - revocation changes valid -> revoked while preserving existence.
// -----------------------------------------------------------------------------

// Contract-level tests for the Lab 4 certificate registry.
// These tests document the core rules YOU should understand:
// issuer-only writes, public verification, duplicate prevention, and revocation.
describe("CertificateRegistry", function () {
  // Shared sample certificate fields used by most test cases.
  const sample = {
    studentId: "STU-2001",
    studentName: "Omar Nabil",
    courseName: "Blockchain Foundations",
    grade: "A"
  };

  // Deploy a fresh registry for each test so state never leaks between cases.
  // The first signer is the issuer; the second signer represents an unauthorized user.
  async function deployFixture() {
    const [issuer, otherAccount] = await ethers.getSigners();
    const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
    const contract = await CertificateRegistry.deploy();
    await contract.waitForDeployment();

    const certificateHash = await contract.computeCertificateHash(
      sample.studentId,
      sample.studentName,
      sample.courseName,
      sample.grade
    );

    return { contract, issuer, otherAccount, certificateHash };
  }

  // Confirms the constructor stores the deployer as the only issuer.
  it("stores the deployer as the issuer", async function () {
    const { contract, issuer } = await deployFixture();

    assert.equal(await contract.issuer(), issuer.address);
    assert.equal(await contract.certificateCount(), 0n);
  });

  // Happy path: the issuer stores a certificate and anyone can verify it.
  it("allows the issuer to issue and verify a certificate", async function () {
    const { contract, certificateHash } = await deployFixture();

    await contract.issueCertificate(
      certificateHash,
      sample.studentId,
      sample.studentName,
      sample.courseName,
      sample.grade
    );

    const verification = await contract.verifyCertificate(certificateHash);
    const certificate = await contract.getCertificate(certificateHash);

    assert.equal(verification[0], true);
    assert.equal(verification[1], true);
    assert.equal(verification[2], false);
    assert.equal(certificate[0], sample.studentId);
    assert.equal(certificate[1], sample.studentName);
    assert.equal(certificate[2], sample.courseName);
    assert.equal(certificate[3], sample.grade);
    assert.equal(await contract.certificateCount(), 1n);
  });

  // Protects uniqueness: the same hash cannot be issued twice.
  it("rejects duplicate certificate hashes", async function () {
    const { contract, certificateHash } = await deployFixture();

    await contract.issueCertificate(
      certificateHash,
      sample.studentId,
      sample.studentName,
      sample.courseName,
      sample.grade
    );

    let failed = false;
    try {
      await contract.issueCertificate(
        certificateHash,
        sample.studentId,
        sample.studentName,
        sample.courseName,
        sample.grade
      );
    } catch (error) {
      failed = true;
      assert.match(error.message, /already exists/i);
    }

    assert.equal(failed, true);
  });

  // Proves access control is enforced by the contract, not only by the API.
  it("rejects issuing from a non-issuer account", async function () {
    const { contract, otherAccount, certificateHash } = await deployFixture();

    let failed = false;
    try {
      await contract.connect(otherAccount).issueCertificate(
        certificateHash,
        sample.studentId,
        sample.studentName,
        sample.courseName,
        sample.grade
      );
    } catch (error) {
      failed = true;
      assert.match(error.message, /only issuer/i);
    }

    assert.equal(failed, true);
  });

  // Revocation preserves the record but changes verification from valid to revoked.
  it("can revoke a previously issued certificate", async function () {
    const { contract, certificateHash } = await deployFixture();

    await contract.issueCertificate(
      certificateHash,
      sample.studentId,
      sample.studentName,
      sample.courseName,
      sample.grade
    );
    await contract.revokeCertificate(certificateHash, "Wrong student ID");

    const verification = await contract.verifyCertificate(certificateHash);

    assert.equal(verification[0], true);
    assert.equal(verification[1], false);
    assert.equal(verification[2], true);
    assert.equal(await contract.revokedCount(), 1n);
  });
});
