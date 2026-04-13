const API_BASE = "http://localhost:3001";

const healthBadge = document.getElementById("healthBadge");
const networkLabel = document.getElementById("networkLabel");
const blockLabel = document.getElementById("blockLabel");
const objectiveList = document.getElementById("objectiveList");
const conceptCards = document.getElementById("conceptCards");
const accountGrid = document.getElementById("accountGrid");
const blockCard = document.getElementById("blockCard");
const senderSelect = document.getElementById("senderSelect");
const receiverSelect = document.getElementById("receiverSelect");
const amountInput = document.getElementById("amountInput");
const transferForm = document.getElementById("transferForm");
const sendButton = document.getElementById("sendButton");
const formStatus = document.getElementById("formStatus");
const formHint = document.getElementById("formHint");
const resultCard = document.getElementById("resultCard");
const refreshButton = document.getElementById("refreshButton");
const stageList = document.getElementById("stageList");
const ruleList = document.getElementById("ruleList");
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
  wallet: document.getElementById("flowWallet"),
  chain: document.getElementById("flowChain"),
  block: document.getElementById("flowBlock"),
  receiver: document.getElementById("flowReceiver")
};

const runtime = {
  accounts: [],
  latestBlock: null
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
  if (!value) return "-";
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
  if (!node) return;
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
  if (!fromNode || !toNode) return;

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

function renderAccounts(accounts) {
  accountGrid.innerHTML = accounts
    .map(
      (account) => `
        <article class="account-card">
          <p class="account-role">${escapeHtml(account.role)}</p>
          <h3>${escapeHtml(account.label)}</h3>
          <p class="account-balance">${escapeHtml(account.balanceEth)} ETH</p>
          <p class="mono small">${escapeHtml(shortValue(account.address, 12, 6))}</p>
          <div class="account-meta">
            <span>Nonce</span>
            <strong>${account.nonce}</strong>
          </div>
        </article>
      `
    )
    .join("");
}

function populateAccountSelects(accounts) {
  const previousSender = senderSelect.value;
  const previousReceiver = receiverSelect.value;

  const options = accounts
    .map(
      (account) =>
        `<option value="${escapeHtml(account.address)}">${escapeHtml(
          `${account.label} | ${account.balanceEth} ETH | nonce ${account.nonce}`
        )}</option>`
    )
    .join("");

  senderSelect.innerHTML = options;
  receiverSelect.innerHTML = options;

  senderSelect.value = accounts.find((account) => account.address === previousSender)?.address || accounts[0]?.address || "";
  receiverSelect.value =
    accounts.find((account) => account.address === previousReceiver)?.address ||
    accounts[1]?.address ||
    accounts[0]?.address ||
    "";

  keepSelectionsDifferent();
}

function renderBlock(block) {
  runtime.latestBlock = block;

  const lastTx = block.lastTransaction;
  blockCard.innerHTML = `
    <p class="mini-label">Block number</p>
    <p class="block-number">${block.blockNumber}</p>
    <div class="block-meta-grid">
      <div>
        <span class="mini-label">Transactions</span>
        <strong>${block.transactionCount}</strong>
      </div>
      <div>
        <span class="mini-label">Gas used</span>
        <strong>${escapeHtml(block.gasUsed)}</strong>
      </div>
      <div>
        <span class="mini-label">Timestamp</span>
        <strong>${escapeHtml(block.timestampIso || "-")}</strong>
      </div>
      <div>
        <span class="mini-label">Last tx</span>
        <strong>${escapeHtml(lastTx ? shortValue(lastTx.hash, 10, 6) : "No tx yet")}</strong>
      </div>
    </div>
    ${
      lastTx
        ? `
          <div class="block-last-tx">
            <p class="mini-label">Latest transfer in this block</p>
            <p class="mono">${escapeHtml(shortValue(lastTx.from, 12, 6))} -> ${escapeHtml(shortValue(lastTx.to, 12, 6))}</p>
            <p>${escapeHtml(lastTx.valueEth)} ETH | gas ${escapeHtml(lastTx.gasUsed)}</p>
          </div>
        `
        : ""
    }
  `;
}

function renderTransferResult(data) {
  resultCard.classList.remove("empty");
  resultCard.innerHTML = `
    <p class="mini-label">Transaction hash</p>
    <p class="mono result-hash">${escapeHtml(data.txHash)}</p>
    <div class="compare-grid">
      <div class="compare-card">
        <span class="mini-label">Sender</span>
        <h3>${escapeHtml(data.sender.label)}</h3>
        <p>${escapeHtml(data.sender.balanceBeforeEth)} ETH -> ${escapeHtml(data.sender.balanceAfterEth)} ETH</p>
        <p>Nonce ${data.sender.nonceBefore} -> ${data.sender.nonceAfter}</p>
      </div>
      <div class="compare-card">
        <span class="mini-label">Receiver</span>
        <h3>${escapeHtml(data.receiver.label)}</h3>
        <p>${escapeHtml(data.receiver.balanceBeforeEth)} ETH -> ${escapeHtml(data.receiver.balanceAfterEth)} ETH</p>
        <p>Nonce stays at ${data.receiver.nonceAfter}</p>
      </div>
    </div>
    <div class="transfer-summary">
      <p><strong>Amount:</strong> ${escapeHtml(data.transfer.amountEth)} ETH</p>
      <p><strong>Block:</strong> ${data.blockNumber}</p>
      <p><strong>Gas used:</strong> ${escapeHtml(data.transfer.gasUsed || "-")}</p>
      <p><strong>Gas price:</strong> ${escapeHtml(data.transfer.gasPriceGwei || "-")} gwei</p>
    </div>
  `;
}

async function loadFoundation() {
  const data = await getJson(`${API_BASE}/api/foundation`);
  renderObjectives(data.objectives);
  renderCards(data.cards);
  renderStages(data.stages);
  renderRules(data.transferRules);
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
  runtime.accounts = data.accounts;
  renderAccounts(data.accounts);
  populateAccountSelects(data.accounts);
}

async function loadLatestBlock() {
  const data = await getJson(`${API_BASE}/api/blocks/latest`);
  renderBlock(data.latestBlock);
  blockLabel.textContent = String(data.latestBlock.blockNumber);
}

function keepSelectionsDifferent() {
  if (senderSelect.value && senderSelect.value === receiverSelect.value) {
    const alternative = runtime.accounts.find((account) => account.address !== senderSelect.value);
    if (alternative) {
      receiverSelect.value = alternative.address;
    }
  }
}

async function refreshDashboard() {
  await Promise.all([loadHealth(), loadAccounts(), loadLatestBlock()]);
}

async function submitTransfer(event) {
  event.preventDefault();

  keepSelectionsDifferent();
  if (!senderSelect.value || !receiverSelect.value) {
    formStatus.textContent = "Choose both sender and receiver.";
    return;
  }

  if (senderSelect.value === receiverSelect.value) {
    formStatus.textContent = "Sender and receiver must be different.";
    return;
  }

  sendButton.disabled = true;
  sendButton.textContent = "Sending...";
  formStatus.textContent = "";
  showSteps(true);
  setStep(step1, "active");
  addEvent("Transfer request submitted from the browser.", "info");

  try {
    await tracePath(["browser", "api"], "The browser is sending the transfer request to the API.");

    const payload = {
      senderAddress: senderSelect.value,
      receiverAddress: receiverSelect.value,
      amountEth: amountInput.value
    };

    const result = await getJson(`${API_BASE}/api/transactions/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setStep(step1, "done");
    setStep(step2, "active");
    addEvent(`Transaction mined in block ${result.blockNumber}.`, "ok");

    await tracePath(
      ["api", "wallet", "chain", "block"],
      "The signer and the Hardhat node are creating and mining the transaction."
    );

    setStep(step2, "done");
    setStep(step3, "active");

    await refreshDashboard();
    renderTransferResult(result);

    await tracePath(
      ["block", "receiver"],
      "Balances and nonce are now refreshed from the chain."
    );

    setStep(step3, "done");
    formStatus.textContent = `Transfer complete. ${result.transfer.amountEth} ETH moved to ${result.receiver.label}.`;
    formHint.textContent = "Watch how the sender nonce increased by one while the receiver nonce stayed the same.";
    addEvent(`${result.sender.label} sent ${result.transfer.amountEth} ETH to ${result.receiver.label}.`, "ok");
  } catch (error) {
    setStep(step1, "error");
    formStatus.textContent = `Failed: ${error.message}`;
    setFlow(["browser", "api"], "The request failed before the chain update completed.");
    addEvent(`Transfer failed: ${error.message}`, "error");
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Send local transfer";
    setTimeout(() => showSteps(false), 3500);
  }
}

senderSelect.addEventListener("change", keepSelectionsDifferent);
receiverSelect.addEventListener("change", keepSelectionsDifferent);
transferForm.addEventListener("submit", submitTransfer);
refreshButton.addEventListener("click", async () => {
  addEvent("Refreshing balances and latest block.", "info");
  await refreshDashboard();
});

async function bootstrap() {
  try {
    await loadFoundation();
    await refreshDashboard();
    addEvent("Lab 2 dashboard loaded successfully.", "ok");
  } catch (error) {
    healthBadge.textContent = "Chain unavailable";
    healthBadge.className = "status error";
    addEvent(`Startup failed: ${error.message}`, "error");
  }
}

bootstrap();
