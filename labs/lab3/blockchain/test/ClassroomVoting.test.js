const assert = require("node:assert/strict");

describe("ClassroomVoting", function () {
  async function deployFixture(durationSeconds = 3600) {
    const [organizer, voterA, voterB] = await ethers.getSigners();
    const proposalNames = ["Proposal A", "Proposal B", "Proposal C"];

    const ClassroomVoting = await ethers.getContractFactory("ClassroomVoting");
    const contract = await ClassroomVoting.deploy(
      "Lab 3 Test Vote",
      proposalNames,
      durationSeconds
    );
    await contract.waitForDeployment();

    return { contract, organizer, voterA, voterB, proposalNames };
  }

  it("stores the organizer and proposal list", async function () {
    const { contract, organizer, proposalNames } = await deployFixture();

    assert.equal(await contract.organizer(), organizer.address);
    assert.equal(await contract.proposalCount(), 3n);

    const proposalZero = await contract.getProposal(0);
    assert.equal(proposalZero[0], proposalNames[0]);
    assert.equal(proposalZero[1], 0n);
  });

  it("allows one valid vote per address", async function () {
    const { contract, voterA } = await deployFixture();

    await contract.connect(voterA).vote(1);

    const proposalOne = await contract.getProposal(1);
    const voteInfo = await contract.voteInfo(voterA.address);

    assert.equal(proposalOne[1], 1n);
    assert.equal(voteInfo[0], true);
    assert.equal(voteInfo[1], 1n);
    assert.equal(await contract.votersParticipated(), 1n);
  });

  it("rejects a second vote from the same address", async function () {
    const { contract, voterA } = await deployFixture();

    await contract.connect(voterA).vote(0);

    let failed = false;
    try {
      await contract.connect(voterA).vote(1);
    } catch (error) {
      failed = true;
      assert.match(error.message, /already voted/i);
    }

    assert.equal(failed, true);
  });

  it("rejects votes after the deadline", async function () {
    const { contract, voterA } = await deployFixture(5);

    await network.provider.send("evm_increaseTime", [6]);
    await network.provider.send("evm_mine");

    let failed = false;
    try {
      await contract.connect(voterA).vote(0);
    } catch (error) {
      failed = true;
      assert.match(error.message, /ended/i);
    }

    assert.equal(failed, true);
  });
});
