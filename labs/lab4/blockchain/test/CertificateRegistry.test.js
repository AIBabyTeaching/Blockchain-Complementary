const assert = require("node:assert/strict");

describe("CertificateRegistry", function () {
  const sample = {
    studentId: "STU-2001",
    studentName: "Omar Nabil",
    courseName: "Blockchain Foundations",
    grade: "A"
  };

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

  it("stores the deployer as the issuer", async function () {
    const { contract, issuer } = await deployFixture();

    assert.equal(await contract.issuer(), issuer.address);
    assert.equal(await contract.certificateCount(), 0n);
  });

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
