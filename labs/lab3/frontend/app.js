const API_BASE = "http://localhost:3002";

const healthBadge = document.getElementById("healthBadge");
const networkLabel = document.getElementById("networkLabel");
const blockLabel = document.getElementById("blockLabel");
const objectiveList = document.getElementById("objectiveList");
const conceptCards = document.getElementById("conceptCards");
const deployNotice = document.getElementById("deployNotice");
const electionCard = document.getElementById("electionCard");
const accountGrid = document.getElementById("accountGrid");
const proposalGrid = document.getElementById("proposalGrid");
const voterSelect = document.getElementById("voterSelect");
const selectedProposalLabel = document.getElementById("selectedProposalLabel");
const voteForm = document.getElementById("voteForm");
const voteButton = document.getElementById("voteButton");
const formHint = document.getElementById("formHint");
const formStatus = document.getElementById("formStatus");
const resultCard = document.getElementById("resultCard");
const refreshButton = document.getElementById("refreshButton");
const stageList = document.getElementById("stageList");
const ruleList = document.getElementById("ruleList");
const historyList = document.getElementById("historyList");
const eventFeed = document.getElementById("eventFeed");
const flowHint = document.getElementById("flowHint");
const flowStage = document.getElementById("flowStage");
const flowBubbles = document.getElementById("flowBubbles");
const stepProgress = document.getElementById("stepProgress");
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");

const flowNodes = {
  browser: document.getElementById("flowBrowser"),
  api: document.getElementById("flowApi"),
  signer: document.getElementById("flowSigner"),
  contract: document.getElementById("flowContract"),
  event: document.getElementById("flowEvent"),
  state: document.getElementById("flowState")
};

const runtime = {
  accounts: [],
  election: null,
  history: [],
  selectedProposalIndex: null
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shortValue(value, start = 8, end = 4) {
  if (!value) {
    return "-";
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowTime() {
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function addEvent(message, type = "info") {
  const item = document.createElement("li");
  item.className = "event-item";

  const dot = document.createElement("span");
  dot.className = `event-dot ${type}`;

  const time = document.createElement("span");
  time.className = "event-time";
  time.textContent = nowTime();

  const text = document.createElement("span");
  text.textContent = message;

  item.append(dot, time, text);
  eventFeed.prepend(item);

  while (eventFeed.children.length > 12) {
    eventFeed.removeChild(eventFeed.lastChild);
  }
}

function showSteps(visible) {
  stepProgress.classList.toggle("hidden", !visible);
  if (!visible) {
    [step1, step2, step3].forEach((step) => {
      step.className = "step-item";
    });
  }
}

function setStep(step, state) {
  step.className = `step-item ${state}`;
}

function setFlow(activeNodes, hint) {
  Object.values(flowNodes).forEach((node) => node.classList.remove("active"));
  activeNodes.forEach((key) => {
    if (flowNodes[key]) {
      flowNodes[key].classList.add("active");
    }
  });
  flowHint.textContent = hint;
}

function flashNode(key) {
  const node = flowNodes[key];
  if (!node) {
    return;
  }

  node.classList.remove("pulse");
  void node.offsetWidth;
  node.classList.add("pulse");
}

function getNodeCenter(node) {
  const stageRect = flowStage.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  return {
    x: nodeRect.left - stageRect.left + nodeRect.width / 2,
    y: nodeRect.top - stageRect.top + nodeRect.height / 2
  };
}

function animateBubble(fromKey, toKey) {
  const fromNode = flowNodes[fromKey];
  const toNode = flowNodes[toKey];
  if (!fromNode || !toNode) {
    return;
  }

  const start = getNodeCenter(fromNode);
  const end = getNodeCenter(toNode);

  const bubble = document.createElement("span");
  bubble.className = "flow-bubble";
  bubble.style.left = `${start.x}px`;
  bubble.style.top = `${start.y}px`;
  flowBubbles.appendChild(bubble);

  requestAnimationFrame(() => {
    bubble.style.left = `${end.x}px`;
    bubble.style.top = `${end.y}px`;
  });

  setTimeout(() => {
    bubble.style.opacity = "0";
    setTimeout(() => bubble.remove(), 240);
  }, 620);
}

async function tracePath(path, hint) {
  for (let index = 0; index < path.length; index += 1) {
    setFlow(path.slice(0, index + 1), hint);
    flashNode(path[index]);
    if (index > 0) {
      animateBubble(path[index - 1], path[index]);
    }
    await wait(170);
  }
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  let data = {};
  try {
    data = await response.json();
  } catch (_) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return data;
}

function renderObjectives(items) {
  objectiveList.innerHTML = items
    .map((item) => `<article class="objective-card"><p>${escapeHtml(item)}</p></article>`)
    .join("");
}

function renderCards(cards) {
  conceptCards.innerHTML = cards
    .map((card) => `<article class="card"><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.detail)}</p></article>`)
    .join("");
}

function renderStages(stages) {
  stageList.innerHTML = stages.map((stage) => `<li>${escapeHtml(stage)}</li>`).join("");
}

function renderRules(rules) {
  ruleList.innerHTML = rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("");
}

function renderElection(election, latestBlock) {
  runtime.election = election;

  const statusText = election.isVotingOpen
    ? `Open | ${election.remainingSeconds}s remaining`
    : "Closed";

  electionCard.innerHTML = `
    <p class="mini-label">Election title</p>
    <h3 class="election-title">${escapeHtml(election.electionTitle)}</h3>
    <p class="mono small">Contract: ${escapeHtml(shortValue(election.contractAddress, 12, 6))}</p>
    <div class="status-strip">
      <span class="status-pill ${election.isVotingOpen ? "open" : "closed"}">${escapeHtml(statusText)}</span>
      <span class="status-pill neutral">Latest block ${latestBlock.blockNumber}</span>
    </div>
    <div class="election-grid">
      <div>
        <span class="mini-label">Organizer</span>
        <strong>${escapeHtml(shortValue(election.organizer, 12, 6))}</strong>
      </div>
      <div>
        <span class="mini-label">Deadline</span>
        <strong>${escapeHtml(election.deadlineIso)}</strong>
      </div>
      <div>
        <span class="mini-label">Votes cast</span>
        <strong>${election.totalVotes}</strong>
      </div>
      <div>
        <span class="mini-label">Unique voters</span>
        <strong>${election.votersParticipated}</strong>
      </div>
    </div>
    <div class="leader-box">
      <span class="mini-label">Current leader</span>
      <strong>${escapeHtml(election.leader ? election.leader.name : "No leader yet")}</strong>
      <p>${election.leader ? election.leader.voteCount : 0} vote(s)</p>
    </div>
  `;
}

function renderAccounts(accounts) {
  runtime.accounts = accounts;

  accountGrid.innerHTML = accounts
    .map((account) => {
      const voteStatus = account.hasVoted
        ? `Voted for ${account.selectedProposalName}`
        : "Has not voted yet";

      return `
        <article class="account-card ${account.hasVoted ? "voted" : ""}">
          <p class="account-role">${escapeHtml(account.role)}</p>
          <h3>${escapeHtml(account.label)}</h3>
          <p class="account-balance">${escapeHtml(account.balanceEth)} ETH</p>
          <p class="mono small">${escapeHtml(shortValue(account.address, 12, 6))}</p>
          <div class="account-meta">
            <span>Nonce</span>
            <strong>${account.nonce}</strong>
          </div>
          <p class="vote-status">${escapeHtml(voteStatus)}</p>
        </article>
      `;
    })
    .join("");
}

function populateVoterSelect(accounts) {
  const previousValue = voterSelect.value;
  const options = accounts
    .map(
      (account) =>
        `<option value="${escapeHtml(account.address)}">${escapeHtml(
          `${account.label} | nonce ${account.nonce} | ${account.hasVoted ? "already voted" : "can vote"}`
        )}</option>`
    )
    .join("");

  voterSelect.innerHTML = options;
  voterSelect.value =
    accounts.find((account) => account.address === previousValue)?.address ||
    accounts[0]?.address ||
    "";
}

function selectProposal(index) {
  runtime.selectedProposalIndex = index;

  if (!runtime.election) {
    selectedProposalLabel.textContent = "No proposal selected yet.";
    return;
  }

  const selectedProposal = runtime.election.proposals.find((proposal) => proposal.index === index);
  selectedProposalLabel.textContent = selectedProposal
    ? `${selectedProposal.name} (${selectedProposal.voteCount} vote(s) right now)`
    : "No proposal selected yet.";

  renderProposals(runtime.election.proposals);
}

function renderProposals(proposals) {
  const highestVoteCount = Math.max(1, ...proposals.map((proposal) => proposal.voteCount));

  proposalGrid.innerHTML = proposals
    .map((proposal) => {
      const percentage = Math.round((proposal.voteCount / highestVoteCount) * 100);
      const isSelected = proposal.index === runtime.selectedProposalIndex;

      return `
        <article class="proposal-card ${isSelected ? "selected" : ""}" data-proposal-index="${proposal.index}">
          <p class="mini-label">Proposal ${proposal.index + 1}</p>
          <h3>${escapeHtml(proposal.name)}</h3>
          <p class="proposal-votes">${proposal.voteCount} vote(s)</p>
          <div class="meter">
            <span style="width: ${percentage}%"></span>
          </div>
          <button class="proposal-button" type="button" data-proposal-index="${proposal.index}">
            ${isSelected ? "Selected" : "Choose this proposal"}
          </button>
        </article>
      `;
    })
    .join("");
}

function renderHistory(history) {
  runtime.history = history;

  if (!history.length) {
    historyList.innerHTML = `<li class="history-item empty">No votes yet. The first successful vote will appear here.</li>`;
    return;
  }

  historyList.innerHTML = history
    .map(
      (item) => `
        <li class="history-item">
          <div class="history-head">
            <strong>${escapeHtml(item.proposalName)}</strong>
            <span class="mono small">${escapeHtml(shortValue(item.transactionHash, 12, 6))}</span>
          </div>
          <p>${escapeHtml(shortValue(item.voter, 12, 6))} voted in block ${item.blockNumber}.</p>
          <p class="small muted">${escapeHtml(item.timestampIso || "-")}</p>
        </li>
      `
    )
    .join("");
}

function renderResult(result) {
  resultCard.classList.remove("empty");
  resultCard.innerHTML = `
    <p class="mini-label">Transaction hash</p>
    <p class="mono result-hash">${escapeHtml(result.txHash)}</p>
    <div class="compare-grid">
      <div class="compare-card">
        <span class="mini-label">Voter account</span>
        <h3>${escapeHtml(result.voter.label)}</h3>
        <p>Nonce ${result.voter.nonceBefore} -> ${result.voter.nonceAfter}</p>
        <p>${escapeHtml(result.voter.balanceBeforeEth)} ETH -> ${escapeHtml(result.voter.balanceAfterEth)} ETH</p>
      </div>
      <div class="compare-card">
        <span class="mini-label">Proposal</span>
        <h3>${escapeHtml(result.proposal.name)}</h3>
        <p>Vote count ${result.proposal.votesBefore} -> ${result.proposal.votesAfter}</p>
        <p>Proposal index ${result.proposal.index + 1}</p>
      </div>
    </div>
    <div class="result-summary">
      <p><strong>Block:</strong> ${result.blockNumber}</p>
      <p><strong>Election leader:</strong> ${escapeHtml(result.election.leader ? result.election.leader.name : "No leader yet")}</p>
      <p><strong>Total votes now:</strong> ${result.election.totalVotes}</p>
    </div>
  `;
}

function showDeployNotice(message) {
  deployNotice.textContent = message;
  deployNotice.classList.remove("hidden");
}

function hideDeployNotice() {
  deployNotice.classList.add("hidden");
}

async function loadFoundation() {
  const data = await getJson(`${API_BASE}/api/foundation`);
  renderObjectives(data.objectives);
  renderCards(data.cards);
  renderStages(data.stages);
  renderRules(data.votingRules);
}

async function loadHealth() {
  const data = await getJson(`${API_BASE}/api/health`);
  healthBadge.textContent = `Chain online | block ${data.blockNumber}`;
  healthBadge.className = "status ok";
  networkLabel.textContent = `Hardhat (${data.chainId})`;
  blockLabel.textContent = String(data.blockNumber);
}

async function loadAccounts() {
  const data = await getJson(`${API_BASE}/api/accounts`);
  renderAccounts(data.accounts);
  populateVoterSelect(data.accounts);
}

async function loadElection() {
  const data = await getJson(`${API_BASE}/api/election`);
  hideDeployNotice();
  renderElection(data.election, data.latestBlock);

  if (runtime.selectedProposalIndex === null && data.election.proposals.length > 0) {
    runtime.selectedProposalIndex = data.election.proposals[0].index;
  }

  renderProposals(data.election.proposals);
  selectProposal(runtime.selectedProposalIndex);
}

async function loadHistory() {
  const data = await getJson(`${API_BASE}/api/election/history`);
  renderHistory(data.history);
}

async function refreshDashboard() {
  await Promise.all([loadHealth(), loadAccounts()]);
  await loadElection();
  await loadHistory();
}

async function submitVote(event) {
  event.preventDefault();

  if (runtime.selectedProposalIndex === null) {
    formStatus.textContent = "Choose a proposal before sending the vote.";
    return;
  }

  if (!voterSelect.value) {
    formStatus.textContent = "Choose a voter account before sending the vote.";
    return;
  }

  voteButton.disabled = true;
  voteButton.textContent = "Sending...";
  formStatus.textContent = "";
  showSteps(true);
  setStep(step1, "active");
  addEvent("Vote request submitted from the browser.", "info");

  try {
    await tracePath(["browser", "api"], "The browser is sending the vote request to the API.");

    const result = await getJson(`${API_BASE}/api/election/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voterAddress: voterSelect.value,
        proposalIndex: runtime.selectedProposalIndex
      })
    });

    setStep(step1, "done");
    setStep(step2, "active");
    addEvent(`Vote transaction mined in block ${result.blockNumber}.`, "ok");

    await tracePath(
      ["api", "signer", "contract", "event"],
      "The signer and contract are processing the vote transaction."
    );

    setStep(step2, "done");
    setStep(step3, "active");

    await refreshDashboard();
    renderResult(result);

    await tracePath(
      ["event", "state"],
      "Proposal totals, leader, and voter state are now refreshed."
    );

    setStep(step3, "done");
    formStatus.textContent = `Vote complete. ${result.voter.label} voted for ${result.proposal.name}.`;
    formHint.textContent =
      "Notice that the voter nonce increased and the selected proposal vote count changed inside the contract.";
    addEvent(`${result.voter.label} voted for ${result.proposal.name}.`, "ok");
  } catch (error) {
    setStep(step1, "error");
    formStatus.textContent = `Failed: ${error.message}`;
    setFlow(["browser", "api"], "The vote request failed before the contract state updated.");
    addEvent(`Vote failed: ${error.message}`, "error");
  } finally {
    voteButton.disabled = false;
    voteButton.textContent = "Send vote to contract";
    setTimeout(() => showSteps(false), 3500);
  }
}

proposalGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-proposal-index]");
  if (!button) {
    return;
  }

  const proposalIndex = Number(button.dataset.proposalIndex);
  if (!Number.isInteger(proposalIndex)) {
    return;
  }

  selectProposal(proposalIndex);
  addEvent(`Proposal ${proposalIndex + 1} selected in the browser.`, "info");
});

voteForm.addEventListener("submit", submitVote);
refreshButton.addEventListener("click", async () => {
  addEvent("Refreshing election, accounts, and history.", "info");
  try {
    await refreshDashboard();
  } catch (error) {
    addEvent(`Refresh failed: ${error.message}`, "error");
  }
});

async function bootstrap() {
  try {
    await loadFoundation();
    await loadHealth();
    await loadAccounts();

    try {
      await loadElection();
      await loadHistory();
    } catch (error) {
      showDeployNotice(error.message);
      renderHistory([]);
      addEvent(`Deployment not ready: ${error.message}`, "error");
    }

    addEvent("Lab 3 dashboard loaded successfully.", "ok");
  } catch (error) {
    healthBadge.textContent = "Chain unavailable";
    healthBadge.className = "status error";
    addEvent(`Startup failed: ${error.message}`, "error");
  }
}

bootstrap();
