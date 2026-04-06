const fs = require("fs");
const path = require("path");

// This script deploys the viewing contracts to the local Hardhat blockchain.
// Its job is not only to deploy, but also to save the deployed addresses so the API
// knows which contract instance it should talk to later.

// main() is the deployment workflow.
// Hardhat injects helpers like `ethers` and `network` into this script runtime.
async function main() {
  // Load the compiled contract factory so we can create a deployable contract instance.
  const SimpleStorage = await ethers.getContractFactory("SimpleStorage");

  // Deploy SimpleStorage to the current network and wait until mining is complete.
  const simpleStorage = await SimpleStorage.deploy();
  await simpleStorage.waitForDeployment();

  // Deploy the second viewing contract used for later labs.
  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
  const certificateRegistry = await CertificateRegistry.deploy();
  await certificateRegistry.waitForDeployment();

  // Build a small metadata document that records where the contracts now live.
  // The API later reads this file to discover the correct addresses.
  const deployment = {
    network: network.name,
    deployedAt: new Date().toISOString(),
    contracts: {
      SimpleStorage: await simpleStorage.getAddress(),
      CertificateRegistry: await certificateRegistry.getAddress()
    }
  };

  // Ensure the output folder exists, then write the deployment file.
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${network.name}.json`),
    JSON.stringify(deployment, null, 2)
  );

  console.log("Deployment saved:", deployment);
}
// End main(): the local chain now has contracts deployed and the workspace has their addresses.

// Standard error wrapper so deployment failures are visible and the process exits correctly.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
// End program entry point.
