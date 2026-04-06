const fs = require("fs");
  // ^ Load Node.js file system module. We use it to write the deployment metadata file later.
const path = require("path");
  // ^ Load Node.js path module. We use it to build correct file paths across operating systems.

// This script deploys the viewing contracts to the local Hardhat blockchain.
// Its job is not only to deploy, but also to save the deployed addresses so the API
// knows which contract instance it should talk to later.

// main() is the deployment workflow.
// Hardhat injects helpers like `ethers` and `network` into this script runtime.
async function main() {
  // ^ "async" means this function may need to wait for network operations (like mining blocks).
  
  // Load the compiled contract factory so we can create a deployable contract instance.
  const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
    // ^ "await" pauses until the contract factory is ready. ethers loads the compiled contract bytecode.
    // ^ "getContractFactory" looks up the name "SimpleStorage" in artifacts built by Hardhat compiler.

  // Deploy SimpleStorage to the current network and wait until mining is complete.
  const simpleStorage = await SimpleStorage.deploy();
    // ^ ".deploy()" actually sends the code to the blockchain and starts mining a block to include it.
    // ^ "await" waits for the transaction to be included in a block (mining takes ~12 seconds on local network).
  await simpleStorage.waitForDeployment();
    // ^ Extra safety check: wait for the contract to be fully available on-chain before continuing.

  // Deploy the second viewing contract used for later labs.
  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
    // ^ Load the CertificateRegistry contract code (compiled by Hardhat).
  const certificateRegistry = await CertificateRegistry.deploy();
    // ^ Deploy it to the blockchain. This creates a second on-chain instance.
  await certificateRegistry.waitForDeployment();
    // ^ Wait for it to be fully available on-chain.

  // Build a small metadata document that records where the contracts now live.
  // The API later reads this file to discover the correct addresses.
  const deployment = {
    // ^ Create a JavaScript object (dict) to hold deployment info.
    network: network.name,
      // ^ Record which network we deployed to (in our case, "hardhat" for local testing).
    deployedAt: new Date().toISOString(),
      // ^ Record the current time in ISO 8601 format. Useful for audit and history.
    contracts: {
      // ^ Create a sub-object to hold each contract's address.
      SimpleStorage: await simpleStorage.getAddress(),
        // ^ Get the actual on-chain address where SimpleStorage was deployed (e.g. "0x5FbDB2315678...").
      CertificateRegistry: await certificateRegistry.getAddress()
        // ^ Get the actual on-chain address where CertificateRegistry was deployed.
    }
  };

  // Ensure the output folder exists, then write the deployment file.
  const outDir = path.join(__dirname, "..", "deployments");
    // ^ __dirname = current script's directory. "..", "deployments" = go up one level to blockchain/, then into deployments/.
  fs.mkdirSync(outDir, { recursive: true });
    // ^ Create the deployments directory if it doesn't exist. recursive: true = create parent dirs too.
  fs.writeFileSync(
    // ^ Write data synchronously (block until file is written, not async).
    path.join(outDir, `${network.name}.json`),
      // ^ File name = network name + ".json". So for local, it's "hardhat.json".
    JSON.stringify(deployment, null, 2)
      // ^ Convert the deployment object to JSON text, formatted with 2-space indentation for readability.
  );

  console.log("Deployment saved:", deployment);
    // ^ Print success message to terminal so the user sees the addresses.
}
// End main(): the local chain now has contracts deployed and the workspace has their addresses.

// Standard error wrapper so deployment failures are visible and the process exits correctly.
main().catch((error) => {
  // ^ .catch() runs if main() throws an error. Prevents unhandled promise rejection crash.
  console.error(error);
    // ^ Print the error to the terminal in red so the user sees what went wrong.
  process.exitCode = 1;
    // ^ Set exit code to 1 (error). Tools running this script will know it failed.
});
// End program entry point.
