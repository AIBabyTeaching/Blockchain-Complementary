const fs = require("fs");
const path = require("path");

async function main() {
  const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
  const simpleStorage = await SimpleStorage.deploy();
  await simpleStorage.waitForDeployment();

  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
  const certificateRegistry = await CertificateRegistry.deploy();
  await certificateRegistry.waitForDeployment();

  const deployment = {
    network: network.name,
    deployedAt: new Date().toISOString(),
    contracts: {
      SimpleStorage: await simpleStorage.getAddress(),
      CertificateRegistry: await certificateRegistry.getAddress()
    }
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${network.name}.json`),
    JSON.stringify(deployment, null, 2)
  );

  console.log("Deployment saved:", deployment);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
