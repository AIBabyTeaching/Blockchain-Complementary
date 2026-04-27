const API_BASE = "http://localhost:3003";

const healthBadge = document.getElementById("healthBadge");
const networkLabel = document.getElementById("networkLabel");
const blockLabel = document.getElementById("blockLabel");
const objectiveList = document.getElementById("objectiveList");
const conceptCards = document.getElementById("conceptCards");
const proofTableBody = document.getElementById("proofTableBody");
const deployNotice = document.getElementById("deployNotice");
const registryCard = document.getElementById("registryCard");
const accountGrid = document.getElementById("accountGrid");
const refreshButton = document.getElementById("refreshButton");
const issuerSelect = document.getElementById("issuerSelect");
const revokeIssuerSelect = document.getElementById("revokeIssuerSelect");
const issueForm = document.getElementById("issueForm");
const issueButton = document.getElementById("issueButton");
const issueStatus = document.getElementById("issueStatus");
const issueResultCard = document.getElementById("issueResultCard");
const verifyForm = document.getElementById("verifyForm");
const verifyHashInput = document.getElementById("verifyHashInput");
const verifyButton = document.getElementById("verifyButton");
const verifyStatus = document.getElementById("verifyStatus");
const verifyResultCard = document.getElementById("verifyResultCard");
const sampleHashButton = document.getElementById("sampleHashButton");
const revokeForm = document.getElementById("revokeForm");
const revokeHashInput = document.getElementById("revokeHashInput");
const revokeReasonInput = document.getElementById("revokeReasonInput");
const revokeButton = document.getElementById("revokeButton");
const revokeStatus = document.getElementById("revokeStatus");
const historyList = document.getElementById("historyList");
const stageList = document.getElementById("stageList");
const ruleList = document.getElementById("ruleList");
const eventFeed = document.getElementById("eventFeed");
const flowHint = document.getElementById("flowHint");
const flowStage = document.getElementById("flowStage");
const flowBubbles = document.getElementById("flowBubbles");

const flowNodes = {
  browser: document.getElementById("flowBrowser"),
  api: document.getElementById("flowApi"),
  signer: document.getElementById("flowSigner"),
  contract: document.getElementById("flowContract"),
  event: document.getElementById("flowEvent"),
  verifier: document.getElementById("flowVerifier")
};

const runtime = {
  accounts: [],
  registry: null,
  history: []
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
    .map(
      (card) =>
        `<article class="card"><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.detail)}</p></article>`
    )
    .join("");
}

function renderProofs(proofs) {
  proofTableBody.innerHTML = proofs
    .map(
      (proof) => `
        <tr>
          <td><strong>${escapeHtml(proof.mechanism)}</strong></td>
          <td>${escapeHtml(proof.resourceUsed)}</td>
          <td>${escapeHtml(proof.energyProfile)}</td>
          <td>${escapeHtml(proof.decentralization)}</td>
          <td>${escapeHtml(proof.securityModel)}</td>
          <td>${escapeHtml(proof.labUse || "Use this row to connect consensus security to certificate transactions.")}</td>
        </tr>
      `
    )
    .join("");
}

function renderStages(stages) {
  stageList.innerHTML = stages.map((stage) => `<li>${escapeHtml(stage)}</li>`).join("");
}

function renderRules(rules) {
  ruleList.innerHTML = rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("");
}

function showDeployNotice(message) {
  deployNotice.textContent = message;
  deployNotice.classList.remove("hidden");
}

function hideDeployNotice() {
  deployNotice.classList.add("hidden");
}

function renderRegistry(registry, latestBlock) {
  runtime.registry = registry;

  const sampleHash = registry.sampleCertificate?.certificateHash || "";

  registryCard.innerHTML = `
    <p class="mini-label">CertificateRegistry contract</p>
    <h3 class="registry-title">${escapeHtml(shortValue(registry.contractAddress, 12, 6))}</h3>
    <div class="status-strip">
      <span class="status-pill open">Active certificates ${registry.activeCount}</span>
      <span class="status-pill neutral">Total issued ${registry.certificateCount}</span>
      <span class="status-pill closed">Revoked ${registry.revokedCount}</span>
      <span class="status-pill neutral">Latest block ${latestBlock.blockNumber}</span>
    </div>
    <div class="registry-grid">
      <div>
        <span class="mini-label">Issuer</span>
        <strong>${escapeHtml(shortValue(registry.issuer, 12, 6))}</strong>
      </div>
      <div>
        <span class="mini-label">Sample hash</span>
        <strong class="mono wrap">${escapeHtml(sampleHash ? shortValue(sampleHash, 14, 8) : "-")}</strong>
      </div>
    </div>
    ${
      registry.sampleCertificate
        ? `<div class="sample-box">
            <span class="mini-label">Deployment sample</span>
            <strong>${escapeHtml(registry.sampleCertificate.studentName)}</strong>
            <p>${escapeHtml(registry.sampleCertificate.courseName)} | ${escapeHtml(registry.sampleCertificate.grade)}</p>
          </div>`
        : ""
    }
    <div class="explain-note">
      <strong>Explain this output:</strong>
      active = issued - revoked. The issuer is the only account allowed to write new certificate status, while the sample hash gives you an immediate value to verify.
    </div>
  `;
}

function renderAccounts(accounts) {
  runtime.accounts = accounts;

  accountGrid.innerHTML = accounts
    .map(
      (account) => `
        <article class="account-card ${account.isIssuer ? "issuer" : ""}">
          <p class="account-role">${escapeHtml(account.role)}</p>
          <h3>${escapeHtml(account.label)}</h3>
          <p class="account-balance">${escapeHtml(account.balanceEth)} ETH</p>
          <p class="mono small">${escapeHtml(shortValue(account.address, 12, 6))}</p>
          <div class="account-meta">
            <span>Nonce</span>
            <strong>${account.nonce}</strong>
          </div>
          <p class="vote-status">${account.isIssuer ? "Registry issuer" : "Read-only unless authorized"}</p>
        </article>
      `
    )
    .join("");
}

function populateIssuerSelects(accounts) {
  const issuerAccount = accounts.find((account) => account.isIssuer) || accounts[0];
  const options = accounts
    .map(
      (account) =>
        `<option value="${escapeHtml(account.address)}">${escapeHtml(
          `${account.label} | nonce ${account.nonce} | ${account.isIssuer ? "issuer" : "not issuer"}`
        )}</option>`
    )
    .join("");

  [issuerSelect, revokeIssuerSelect].forEach((select) => {
    const previousValue = select.value;
    select.innerHTML = options;
    select.value =
      accounts.find((account) => account.address === previousValue)?.address ||
      issuerAccount?.address ||
      "";
  });
}

function certificateStatusLabel(certificate) {
  if (!certificate.exists) {
    return "Not found";
  }

  return certificate.valid ? "Valid" : "Revoked";
}

function certificateExplanation(certificate) {
  if (!certificate.exists) {
    return "This hash has no registry record. Explain that the certificate was not issued by this deployed contract.";
  }

  if (certificate.valid) {
    return "This hash exists and is not revoked. Explain that the certificate is currently accepted by the registry.";
  }

  return "This hash still exists, but it is revoked. Explain that revocation preserves history while making the certificate invalid.";
}

function renderCertificateCard(target, certificate, latestBlock = null) {
  target.classList.remove("empty");

  const statusClass = !certificate.exists ? "neutral" : certificate.valid ? "open" : "closed";
  const blockText = latestBlock ? `<p><strong>Read at block:</strong> ${latestBlock.blockNumber}</p>` : "";

  target.innerHTML = `
    <div class="status-strip">
      <span class="status-pill ${statusClass}">${escapeHtml(certificateStatusLabel(certificate))}</span>
      <span class="status-pill neutral">${certificate.exists ? "Exists on-chain" : "No registry record"}</span>
    </div>
    <p class="mini-label">Certificate hash</p>
    <p class="mono result-hash">${escapeHtml(certificate.certificateHash)}</p>
    ${
      certificate.exists
        ? `<div class="compare-grid">
            <div class="compare-card">
              <span class="mini-label">Student</span>
              <h3>${escapeHtml(certificate.studentName)}</h3>
              <p>${escapeHtml(certificate.studentId)}</p>
            </div>
            <div class="compare-card">
              <span class="mini-label">Course</span>
              <h3>${escapeHtml(certificate.courseName)}</h3>
              <p>Grade ${escapeHtml(certificate.grade)}</p>
            </div>
          </div>
          <div class="result-summary">
            <p><strong>Issued:</strong> ${escapeHtml(certificate.issuedAtIso || "-")}</p>
            <p><strong>Revoked:</strong> ${escapeHtml(certificate.revokedAtIso || "-")}</p>
            ${blockText}
          </div>`
        : `<p class="muted">This hash was not issued by the deployed registry.</p>${blockText}`
    }
    <div class="explain-note">
      <strong>Explain this output:</strong>
      ${escapeHtml(certificateExplanation(certificate))} Verification is a read-only contract call, so it does not create a new transaction or increment a nonce.
    </div>
  `;
}

function renderIssueResult(result) {
  issueResultCard.classList.remove("empty");
  issueResultCard.innerHTML = `
    <p class="mini-label">Transaction hash</p>
    <p class="mono result-hash">${escapeHtml(result.txHash)}</p>
    <div class="compare-grid">
      <div class="compare-card">
        <span class="mini-label">Issuer account</span>
        <h3>${escapeHtml(result.issuer.label)}</h3>
        <p>Nonce ${result.issuer.nonceBefore} -> ${result.issuer.nonceAfter}</p>
        <p>${escapeHtml(result.issuer.balanceBeforeEth)} ETH -> ${escapeHtml(result.issuer.balanceAfterEth)} ETH</p>
      </div>
      <div class="compare-card">
        <span class="mini-label">Registry count</span>
        <h3>${result.registryBefore.certificateCount} -> ${result.registry.certificateCount}</h3>
        <p>Active certificates ${result.registry.activeCount}</p>
      </div>
    </div>
    <div class="result-summary">
      <p><strong>Block:</strong> ${result.blockNumber}</p>
      <p><strong>Certificate:</strong> ${escapeHtml(result.certificate.studentName)} | ${escapeHtml(result.certificate.courseName)}</p>
      <p class="mono wrap">${escapeHtml(result.certificate.certificateHash)}</p>
    </div>
    <div class="explain-note">
      <strong>Explain this output:</strong>
      The issuer nonce increased because issuing is a state-changing transaction. The registry count increased because a new hash was stored. The transaction hash and block number prove when the write was mined.
    </div>
  `;
}

function renderRevokeResult(result) {
  issueResultCard.classList.remove("empty");
  issueResultCard.innerHTML = `
    <p class="mini-label">Revocation transaction</p>
    <p class="mono result-hash">${escapeHtml(result.txHash)}</p>
    <div class="compare-grid">
      <div class="compare-card">
        <span class="mini-label">Issuer account</span>
        <h3>${escapeHtml(result.issuer.label)}</h3>
        <p>Nonce ${result.issuer.nonceBefore} -> ${result.issuer.nonceAfter}</p>
      </div>
      <div class="compare-card">
        <span class="mini-label">Revoked count</span>
        <h3>${result.registryBefore.revokedCount} -> ${result.registry.revokedCount}</h3>
        <p>Certificate remains stored, but valid becomes false.</p>
      </div>
    </div>
    <div class="explain-note">
      <strong>Explain this output:</strong>
      The certificate was not deleted. It still exists for audit purposes, but the registry now reports it as revoked and no longer valid.
    </div>
  `;
}

function renderHistory(history) {
  runtime.history = history;

  if (!history.length) {
    historyList.innerHTML = `<li class="history-item empty">No registry events yet.</li>`;
    return;
  }

  historyList.innerHTML = history
    .map((item) => {
      const title =
        item.type === "issued"
          ? `Issued: ${item.studentName || shortValue(item.certificateHash)}`
          : `Revoked: ${shortValue(item.certificateHash, 12, 6)}`;
      const detail =
        item.type === "issued"
          ? `${item.studentId} | ${item.courseName}`
          : item.reason;

      return `
        <li class="history-item">
          <div class="history-head">
            <strong>${escapeHtml(title)}</strong>
            <span class="mono small">${escapeHtml(shortValue(item.transactionHash, 12, 6))}</span>
          </div>
          <p>${escapeHtml(detail || "-")} in block ${item.blockNumber}.</p>
          <p class="history-explain">${item.type === "issued" ? "Explain as a registry write: a new certificate hash was accepted by the contract." : "Explain as a status update: the existing certificate hash remains stored but becomes invalid."}</p>
          <p class="small muted">${escapeHtml(item.timestampIso || "-")}</p>
        </li>
      `;
    })
    .join("");
}

async function loadFoundation() {
  const data = await getJson(`${API_BASE}/api/foundation`);
  renderObjectives(data.objectives);
  renderCards(data.cards);
  renderProofs(data.proofMechanisms);
  renderStages(data.stages);
  renderRules(data.registryRules);
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
  populateIssuerSelects(data.accounts);
}

async function loadRegistry() {
  const data = await getJson(`${API_BASE}/api/registry`);
  hideDeployNotice();
  renderRegistry(data.registry, data.latestBlock);
}

async function loadHistory() {
  const data = await getJson(`${API_BASE}/api/certificates/history`);
  renderHistory(data.history);
}

async function refreshDashboard() {
  await Promise.all([loadHealth(), loadAccounts()]);
  await loadRegistry();
  await loadHistory();
}

function fillSampleHash() {
  const sampleHash = runtime.registry?.sampleCertificate?.certificateHash;
  if (!sampleHash) {
    verifyStatus.textContent = "Sample certificate is not available until the contract is deployed.";
    return;
  }

  verifyHashInput.value = sampleHash;
  revokeHashInput.value = sampleHash;
  addEvent("Sample certificate hash loaded into the forms.", "info");
}

issueForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  issueButton.disabled = true;
  issueButton.textContent = "Issuing...";
  issueStatus.textContent = "";
  addEvent("Certificate issue request submitted.", "info");

  try {
    await tracePath(["browser", "api"], "The browser is sending certificate fields to the API.");

    const result = await getJson(`${API_BASE}/api/certificates/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issuerAddress: issuerSelect.value,
        studentId: document.getElementById("studentIdInput").value,
        studentName: document.getElementById("studentNameInput").value,
        courseName: document.getElementById("courseNameInput").value,
        grade: document.getElementById("gradeInput").value
      })
    });

    await tracePath(
      ["api", "signer", "contract", "event", "verifier"],
      "The issuer signed the transaction and the registry emitted an event."
    );

    verifyHashInput.value = result.certificate.certificateHash;
    revokeHashInput.value = result.certificate.certificateHash;
    renderIssueResult(result);
    renderCertificateCard(verifyResultCard, result.certificate, result.latestBlock);
    await refreshDashboard();

    issueStatus.textContent = `Issued certificate for ${result.certificate.studentName}.`;
    addEvent(`Certificate issued in block ${result.blockNumber}.`, "ok");
  } catch (error) {
    issueStatus.textContent = `Failed: ${error.message}`;
    setFlow(["browser", "api"], "The issue request failed before registry state changed.");
    addEvent(`Issue failed: ${error.message}`, "error");
  } finally {
    issueButton.disabled = false;
    issueButton.textContent = "Issue certificate hash";
  }
});

verifyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  verifyButton.disabled = true;
  verifyButton.textContent = "Verifying...";
  verifyStatus.textContent = "";
  addEvent("Certificate verification requested.", "info");

  try {
    await tracePath(["browser", "api", "contract", "verifier"], "Verification reads registry state without sending a transaction.");

    const result = await getJson(`${API_BASE}/api/certificates/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        certificateHash: verifyHashInput.value
      })
    });

    renderCertificateCard(verifyResultCard, result.certificate, result.latestBlock);
    verifyStatus.textContent = `Verification result: ${certificateStatusLabel(result.certificate)}.`;
    addEvent(`Verification result: ${certificateStatusLabel(result.certificate)}.`, "ok");
  } catch (error) {
    verifyStatus.textContent = `Failed: ${error.message}`;
    addEvent(`Verification failed: ${error.message}`, "error");
  } finally {
    verifyButton.disabled = false;
    verifyButton.textContent = "Verify hash";
  }
});

revokeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  revokeButton.disabled = true;
  revokeButton.textContent = "Revoking...";
  revokeStatus.textContent = "";
  addEvent("Certificate revocation request submitted.", "info");

  try {
    await tracePath(["browser", "api"], "The browser is sending a revocation request to the API.");

    const result = await getJson(`${API_BASE}/api/certificates/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issuerAddress: revokeIssuerSelect.value,
        certificateHash: revokeHashInput.value,
        reason: revokeReasonInput.value
      })
    });

    await tracePath(
      ["api", "signer", "contract", "event", "verifier"],
      "The registry marked the certificate as revoked and emitted an event."
    );

    renderRevokeResult(result);
    renderCertificateCard(verifyResultCard, result.certificate, result.latestBlock);
    await refreshDashboard();

    revokeStatus.textContent = `Revoked certificate ${shortValue(result.certificate.certificateHash, 12, 6)}.`;
    addEvent(`Certificate revoked in block ${result.blockNumber}.`, "ok");
  } catch (error) {
    revokeStatus.textContent = `Failed: ${error.message}`;
    setFlow(["browser", "api"], "The revoke request failed before registry state changed.");
    addEvent(`Revoke failed: ${error.message}`, "error");
  } finally {
    revokeButton.disabled = false;
    revokeButton.textContent = "Revoke certificate";
  }
});

sampleHashButton.addEventListener("click", fillSampleHash);
refreshButton.addEventListener("click", async () => {
  addEvent("Refreshing registry, accounts, and history.", "info");
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
      await loadRegistry();
      await loadHistory();
      fillSampleHash();
    } catch (error) {
      showDeployNotice(error.message);
      renderHistory([]);
      addEvent(`Deployment not ready: ${error.message}`, "error");
    }

    addEvent("Lab 4 dashboard loaded successfully.", "ok");
  } catch (error) {
    healthBadge.textContent = "Chain unavailable";
    healthBadge.className = "status error";
    addEvent(`Startup failed: ${error.message}`, "error");
  }
}

bootstrap();
