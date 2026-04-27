const fs = require("fs");
const path = require("path");

function computeCertificateHash({ studentId, studentName, courseName, grade }) {
  return ethers.keccak256(
    ethers.toUtf8Bytes([studentId, studentName, courseName, grade].join("|"))
  );
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
  const registry = await CertificateRegistry.deploy();
  await registry.waitForDeployment();

  const sampleCertificate = {
    studentId: "STU-1001",
    studentName: "Mariam Hassan",
    courseName: "Blockchain Foundations",
    grade: "A"
  };
  const sampleHash = computeCertificateHash(sampleCertificate);

  const issueTx = await registry.issueCertificate(
    sampleHash,
    sampleCertificate.studentId,
    sampleCertificate.studentName,
    sampleCertificate.courseName,
    sampleCertificate.grade
  );
  const issueReceipt = await issueTx.wait();

  const deploymentTx = registry.deploymentTransaction();
  const deploymentReceipt = deploymentTx ? await deploymentTx.wait() : null;

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

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${network.name}.json`),
    JSON.stringify(deployment, null, 2)
  );

  console.log("Lab 4 deployment saved:", deployment);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
