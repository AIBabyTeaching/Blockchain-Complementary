const fs = require("fs");
const path = require("path");

// This deployment script creates one fixed classroom election.
// The data is intentionally simple and readable so you can connect:
// deployment metadata -> contract address -> API -> frontend.
async function main() {
  const [deployer] = await ethers.getSigners();

  const electionTitle =
    process.env.ELECTION_TITLE || "Lab 3 Classroom Vote: Best Blockchain Use Case";
  const votingDurationSeconds = Number(process.env.VOTING_DURATION_SECONDS || 86400);
  const proposalNames = [
    "Certificate verification",
    "Supply chain transparency",
    "Campus voting system"
  ];

  const ClassroomVoting = await ethers.getContractFactory("ClassroomVoting");
  const votingContract = await ClassroomVoting.deploy(
    electionTitle,
    proposalNames,
    votingDurationSeconds
  );

  await votingContract.waitForDeployment();

  const deploymentTx = votingContract.deploymentTransaction();
  const deploymentReceipt = deploymentTx ? await deploymentTx.wait() : null;

  const deployment = {
    network: network.name,
    deployedAt: new Date().toISOString(),
    deployedBlock: deploymentReceipt ? deploymentReceipt.blockNumber : null,
    organizer: deployer.address,
    electionTitle,
    votingDurationSeconds,
    proposalNames,
    contracts: {
      ClassroomVoting: await votingContract.getAddress()
    }
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${network.name}.json`),
    JSON.stringify(deployment, null, 2)
  );

  console.log("Lab 3 deployment saved:", deployment);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
