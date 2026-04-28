const fs = require("fs");
const path = require("path");

// -----------------------------------------------------------------------------
// Lab 4 Deployment Script Structure
// -----------------------------------------------------------------------------
// 1. Prepare helper:
//    - computeCertificateHash mirrors the Solidity hash formula.
//
// 2. Deploy contract:
//    - first Hardhat signer deploys CertificateRegistry and becomes issuer.
//
// 3. Seed sample data:
//    - one sample certificate is issued immediately for frontend verification.
//
// 4. Save metadata:
//    - deployments/localhost.json stores contract address, issuer, sample hash,
//      and block numbers for the API.
//
// 5. Error handling:
//    - failed deployments print to Docker logs and return non-zero exit code.
// -----------------------------------------------------------------------------

// Keep this helper aligned with CertificateRegistry.computeCertificateHash.
// The deploy script uses it to create the sample certificate hash before
// calling issueCertificate on the deployed contract.
function computeCertificateHash({ studentId, studentName, courseName, grade }) {
  return ethers.keccak256(
    ethers.toUtf8Bytes([studentId, studentName, courseName, grade].join("|"))
  );
}

async function main() {
  // Hardhat provides funded local accounts. The first signer becomes the
  // registry issuer because the contract constructor stores msg.sender.
  const [deployer] = await ethers.getSigners();

  // Compile artifact lookup + deployment of the Lab 4 certificate registry.
  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
  const registry = await CertificateRegistry.deploy();
  await registry.waitForDeployment();

  // The sample certificate gives the frontend something useful to verify as
  // soon as the lab starts, without requiring the student to issue one first.
  const sampleCertificate = {
    studentId: "STU-1001",
    studentName: "Mariam Hassan",
    courseName: "Blockchain Foundations",
    grade: "A"
  };
  const sampleHash = computeCertificateHash(sampleCertificate);

  // Issue the sample certificate through the real contract function.
  // This creates the first CertificateIssued event in the lab history.
  const issueTx = await registry.issueCertificate(
    sampleHash,
    sampleCertificate.studentId,
    sampleCertificate.studentName,
    sampleCertificate.courseName,
    sampleCertificate.grade
  );
  const issueReceipt = await issueTx.wait();

  // Capture the deployment block so the API can query events from the right
  // starting point instead of scanning unrelated old blocks.
  const deploymentTx = registry.deploymentTransaction();
  const deploymentReceipt = deploymentTx ? await deploymentTx.wait() : null;

  // This metadata file is the bridge between the deployer and the API.
  // The API reads it to learn the contract address and sample hash.
  const deployment = {
    network: network.name,
    deployedAt: new Date().toISOString(),
    deployedBlock: deploymentReceipt ? deploymentReceipt.blockNumber : null,
    issuer: deployer.address,
    sampleCertificate: {
      ...sampleCertificate,
      certificateHash: sampleHash,
      issuedBlock: issueReceipt ? issueReceipt.blockNumber : null
    },
    contracts: {
      CertificateRegistry: await registry.getAddress()
    }
  };

  // Write deployments/localhost.json for the Dockerized Lab 4 API.
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${network.name}.json`),
    JSON.stringify(deployment, null, 2)
  );

  console.log("Lab 4 deployment saved:", deployment);
}

// Surface deployment errors in Docker logs and return a non-zero exit code.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
