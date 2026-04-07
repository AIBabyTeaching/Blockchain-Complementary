const API_BASE = "http://localhost:3000";

// --- DOM refs ---
const healthEl          = document.getElementById("health");
const cardsEl           = document.getElementById("cards");
const nextLabsEl        = document.getElementById("nextLabs");
const favoriteNumberEl  = document.getElementById("favoriteNumber");
const lessonMessageEl   = document.getElementById("lessonMessage");
const contractAddressEl = document.getElementById("contractAddress");
const stateBoxEl        = document.getElementById("stateBox");
const formStatusEl      = document.getElementById("formStatus");
const formHintEl        = document.getElementById("formHint");
const flowHintEl        = document.getElementById("flowHint");
const flowStageEl       = document.getElementById("flowStage");
const flowBubblesEl     = document.getElementById("flowBubbles");
const eventFeedEl       = document.getElementById("eventFeed");
const refreshButton     = document.getElementById("refreshButton");
const updateForm        = document.getElementById("updateForm");
const sendButton        = document.getElementById("sendButton");
const numberInput       = document.getElementById("numberInput");
const numberRange       = document.getElementById("numberRange");
const messageInput      = document.getElementById("messageInput");
const scenarioDeckEl    = document.getElementById("scenarioDeck");
const resultBoard       = document.getElementById("resultBoard");
const resultBefore      = document.getElementById("resultBefore");
const resultAfter       = document.getElementById("resultAfter");
const resultTxHash      = document.getElementById("resultTxHash");
const stepProgress      = document.getElementById("stepProgress");
const step1El           = document.getElementById("step1");
const step2El           = document.getElementById("step2");
const step3El           = document.getElementById("step3");

const flowNodes = {
  browser:  document.getElementById("flowBrowser"),
  api:      document.getElementById("flowApi"),
  chain:    document.getElementById("flowChain"),
  contract: document.getElementById("flowContract"),
  state:    document.getElementById("flowState")
};

// --- Preset scenarios ---
const scenarios = [
  {
    title: "Lucky Seven",
    detail: "7 is a common starting value. Even sending it again creates a brand-new permanent transaction.",
    favoriteNumber: 7,
    lessonMessage: "7 is back. A familiar state, but still a new transaction on the chain."
  },
  {
    title: "Near Zero",
    detail: "The smallest value still leaves a permanent mark. The chain records everything, big or small.",
    favoriteNumber: 1,
    lessonMessage: "Even the smallest ripple still reaches the whole chain."
  },
  {
    title: "Certificate Trace",
    detail: "A higher number with a trust message — a preview of the certificate registry coming in Lab 2.",
    favoriteNumber: 34,
    lessonMessage: "Trust is verified on the chain, not assumed between parties."
  },
  {
    title: "Bright Confirmation",
    detail: "A high number. Everyone reading this contract sees the same agreed state at the same time.",
    favoriteNumber: 88,
    lessonMessage: "Everyone reading this contract sees the same ending."
  }
];

// --- Runtime state ---
const runtime = {
  liveState:       null,
  watchId:         null,
  watchCountdownId: null,
  watchBusy:       false,
  lastBlockNumber: null
};

// --- Utilities ---
function escapeHtml(v) {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function nowTime() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, "0")).join(":");
}

// --- Visual helpers ---
function flashStateChange() {
  if (!stateBoxEl) return;
  stateBoxEl.classList.remove("state-changed");
  void stateBoxEl.offsetWidth;
  stateBoxEl.classList.add("state-changed");
  setTimeout(() => stateBoxEl.classList.remove("state-changed"), 1700);
}

function showResult(before, after, txHash) {
  resultBefore.textContent = String(before !== null && before !== undefined ? before : "-");
  resultAfter.textContent  = String(after  !== null && after  !== undefined ? after  : "-");
  resultTxHash.textContent = txHash ? "Tx: " + txHash.slice(0, 22) + "..." : "";
  resultBoard.classList.remove("hidden");
}

function showSteps(visible) {
  stepProgress.classList.toggle("hidden", !visible);
  if (!visible) {
    [step1El, step2El, step3El].forEach(s => { s.className = "step-item"; });
  }
}

function setStep(el, state) {
  el.className = "step-item " + state;
}

function suggestDifferentValue(chainValue) {
  const pool = [7, 21, 42, 55, 69, 88, 99].filter(n => n !== chainValue);
  const suggestion = pool[Math.floor(Math.random() * pool.length)];
  numberInput.value = String(suggestion);
  numberRange.value = String(suggestion);
  if (formHintEl) {
    formHintEl.textContent =
      "The chain holds " + chainValue + " right now. " +
      "Try changing it to " + suggestion + " (or any number you like) and hit Send to chain.";
  }
}

// --- Events ---
function addEvent(msg, type) {
  const item = document.createElement("li");
  item.className = "event-item";
  const dot = document.createElement("span");
  dot.className = "event-dot" + (type === "ok" ? " ok" : type === "error" ? " error" : "");
  const time = document.createElement("span");
  time.className = "event-time";
  time.textContent = nowTime();
  const text = document.createElement("span");
  text.textContent = msg;
  item.append(dot, time, text);
  eventFeedEl.prepend(item);
  while (eventFeedEl.children.length > 14) {
    eventFeedEl.removeChild(eventFeedEl.lastChild);
  }
}

// --- Flow diagram ---
function setFlow(activeNodes, hint) {
  Object.values(flowNodes).forEach(n => n.classList.remove("active"));
  activeNodes.forEach(k => { if (flowNodes[k]) flowNodes[k].classList.add("active"); });
  flowHintEl.textContent = hint;
}

function flashNode(key) {
  const node = flowNodes[key];
  if (!node) return;
  node.classList.remove("pulse");
  void node.offsetWidth;
  node.classList.add("pulse");
}

function getNodeCenter(node) {
  const sr = flowStageEl.getBoundingClientRect();
  const nr = node.getBoundingClientRect();
  return { x: nr.left - sr.left + nr.width / 2, y: nr.top - sr.top + nr.height / 2 };
}

function animateBubble(fromKey, toKey, variant) {
  const fn = flowNodes[fromKey];
  const tn = flowNodes[toKey];
  if (!fn || !tn) return;
  const s = getNodeCenter(fn);
  const e = getNodeCenter(tn);
  const b = document.createElement("span");
  b.className = "flow-bubble" + (variant === "error" ? " error" : "");
  b.style.left = s.x + "px";
  b.style.top  = s.y + "px";
  flowBubblesEl.appendChild(b);
  requestAnimationFrame(() => { b.style.left = e.x + "px"; b.style.top = e.y + "px"; });
  setTimeout(() => { b.style.opacity = "0"; setTimeout(() => b.remove(), 260); }, 600);
}

async function tracePath(path, options) {
  const variant = (options && options.variant) || "ok";
  const hint    = (options && options.hint)    || flowHintEl.textContent;
  for (let i = 0; i < path.length; i++) {
    setFlow(path.slice(0, i + 1), hint);
    flashNode(path[i]);
    if (i > 0) animateBubble(path[i - 1], path[i], variant);
    await wait(180);
  }
}

// --- API ---
async function getJson(url, options) {
  const resp = await fetch(url, options);
  let data = {};
  try { data = await resp.json(); } catch (_) {}
  if (!resp.ok) throw new Error(data.message || "HTTP " + resp.status);
  return data;
}

// --- Renders ---
function renderCards(cards) {
  cardsEl.innerHTML = cards.map(c =>
    "<article class=\"card\"><h3>" + escapeHtml(c.title) + "</h3><p>" + escapeHtml(c.detail) + "</p></article>"
  ).join("");
}

function renderTimeline(items) {
  nextLabsEl.innerHTML = items.map(i => "<li>" + escapeHtml(i) + "</li>").join("");
}

function renderScenarios() {
  scenarioDeckEl.innerHTML = scenarios.map((s, i) =>
    "<button class=\"scenario-card\" type=\"button\" data-idx=\"" + i + "\">" +
    "<strong>" + escapeHtml(s.title) + "</strong>" +
    "<span class=\"scenario-kicker\">Sets number to " + s.favoriteNumber + "</span>" +
    "<p>" + escapeHtml(s.detail) + "</p>" +
    "</button>"
  ).join("");
}

// --- State ---
function applyLiveState(data) {
  const previous = runtime.liveState;
  const next = {
    favoriteNumber:  Number(data.favoriteNumber),
    lessonMessage:   data.lessonMessage,
    contractAddress: data.contractAddress
  };
  runtime.liveState = next;
  favoriteNumberEl.textContent  = next.favoriteNumber;
  lessonMessageEl.textContent   = next.lessonMessage;
  contractAddressEl.textContent = "Contract address: " + next.contractAddress;
  const changed = !previous ||
    previous.favoriteNumber !== next.favoriteNumber ||
    previous.lessonMessage  !== next.lessonMessage;
  return { previous, next, changed };
}

// --- Loaders ---
async function loadFoundation() {
  try {
    const data = await getJson(API_BASE + "/api/foundation");
    renderCards(data.cards);
    renderTimeline(data.nextLabs);
    addEvent("Foundation cards loaded.", "ok");
  } catch (e) {
    addEvent("Foundation error: " + e.message, "error");
  }
}

async function loadHealth(opts) {
  const quiet = opts && opts.quiet;
  try {
    if (!quiet) {
      await tracePath(["browser", "api", "chain"], {
        hint: "Checking whether the chain is running...", variant: "ok"
      });
    }
    const data = await getJson(API_BASE + "/api/health");
    healthEl.textContent = "Chain online | block " + data.blockNumber;
    healthEl.className = "status ok";
    if (!quiet) {
      addEvent("Chain is live at block " + data.blockNumber + ".", "ok");
    } else if (runtime.lastBlockNumber !== null && runtime.lastBlockNumber !== data.blockNumber) {
      addEvent("New block: " + data.blockNumber + ".", "info");
    }
    runtime.lastBlockNumber = data.blockNumber;
  } catch (e) {
    healthEl.textContent = "Chain unavailable";
    healthEl.className = "status error";
    if (!quiet) addEvent("Chain check failed: " + e.message, "error");
  }
}

async function loadStorage(opts) {
  const quiet = opts && opts.quiet;
  try {
    if (!quiet) {
      await tracePath(["browser", "api", "chain", "contract", "state"], {
        hint: "Reading contract state from the chain...", variant: "ok"
      });
    }
    const data = await getJson(API_BASE + "/api/storage");
    const result = applyLiveState(data);
    setFlow(["browser", "api", "chain", "contract", "state"], "Live state is on the page.");
    if (!quiet) {
      addEvent("Chain returned favoriteNumber=" + data.favoriteNumber + ".", "ok");
      if (!result.previous) {
        suggestDifferentValue(result.next.favoriteNumber);
      }
    } else if (result.changed) {
      flashStateChange();
      addEvent("Watch: state changed — favoriteNumber is now " + data.favoriteNumber + ".", "ok");
    }
    return result.next;
  } catch (e) {
    if (!quiet) {
      favoriteNumberEl.textContent  = "-";
      lessonMessageEl.textContent   = "Could not read contract state.";
      contractAddressEl.textContent = "";
      addEvent("Storage read failed: " + e.message, "error");
    }
    throw e;
  }
}

// --- Submit ---
async function submitState(payload) {
  if (!Number.isInteger(payload.favoriteNumber) || !payload.lessonMessage.trim()) {
    formStatusEl.textContent = "Fill in both fields before sending.";
    return;
  }
  const prevNumber = runtime.liveState ? runtime.liveState.favoriteNumber : "-";
  let activeStep = step1El;

  sendButton.disabled = true;
  sendButton.textContent = "Sending...";
  formStatusEl.textContent = "";
  showSteps(true);
  setStep(step1El, "active");
  addEvent("Sending transaction — favoriteNumber will become " + payload.favoriteNumber + ".", "info");

  try {
    await tracePath(["browser", "api"], {
      hint: "Your transaction is on its way to the API...", variant: "ok"
    });

    const data = await getJson(API_BASE + "/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    activeStep = step2El;
    setStep(step1El, "done");
    setStep(step2El, "active");
    addEvent("Block mined — Tx " + data.txHash.slice(0, 14) + "...", "ok");

    await tracePath(["api", "chain", "contract"], {
      hint: "Transaction mined. Reading the new state back...", variant: "ok"
    });

    activeStep = step3El;
    setStep(step2El, "done");
    setStep(step3El, "active");

    await loadStorage({ quiet: true });
    flashStateChange();

    setStep(step3El, "done");
    setFlow(["browser", "api", "chain", "contract", "state"], "State confirmed — your page shows the new value.");

    showResult(prevNumber, payload.favoriteNumber, data.txHash);
    formStatusEl.textContent = "Done. favoriteNumber is now " + payload.favoriteNumber + " on the chain.";
    addEvent("Confirmed: favoriteNumber = " + payload.favoriteNumber + ".", "ok");
    suggestDifferentValue(payload.favoriteNumber);

  } catch (e) {
    setStep(activeStep, "error");
    formStatusEl.textContent = "Failed: " + e.message;
    addEvent("Transaction failed: " + e.message, "error");
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Send to chain";
    setTimeout(() => showSteps(false), 4000);
  }
}

// --- Watch mode ---
function toggleWatch(btn) {
  if (runtime.watchId) {
    clearInterval(runtime.watchId);
    if (runtime.watchCountdownId) {
      clearInterval(runtime.watchCountdownId);
      runtime.watchCountdownId = null;
    }
    runtime.watchId = null;
    if (btn) { btn.textContent = "Watch the chain"; btn.classList.remove("watching"); }
    addEvent("Watch mode stopped.", "info");
    return;
  }
  if (btn) btn.classList.add("watching");
  addEvent("Watch mode on — polling every 5 seconds.", "ok");
  let cd = 5;
  const tick = () => {
    if (cd > 0 && btn) { btn.textContent = "Checking in " + cd + "s..."; cd--; }
  };
  const check = async () => {
    cd = 5;
    if (btn) btn.textContent = "Checking now...";
    if (runtime.watchBusy) return;
    runtime.watchBusy = true;
    try { await loadHealth({ quiet: true }); await loadStorage({ quiet: true }); }
    catch (_) {}
    finally { runtime.watchBusy = false; cd = 5; tick(); }
  };
  check();
  runtime.watchCountdownId = setInterval(tick, 1000);
  runtime.watchId = setInterval(check, 4500);
}

// --- Event listeners ---
refreshButton.addEventListener("click", () => loadStorage());

numberInput.addEventListener("input", () => {
  numberRange.value = numberInput.value;
});

numberRange.addEventListener("input", () => {
  numberInput.value = numberRange.value;
});

scenarioDeckEl.addEventListener("click", e => {
  const card = e.target.closest("[data-idx]");
  if (!card) return;
  const scene = scenarios[Number(card.dataset.idx)];
  numberInput.value = String(scene.favoriteNumber);
  numberRange.value = String(scene.favoriteNumber);
  messageInput.value = scene.lessonMessage;
  if (formHintEl) {
    formHintEl.textContent = "\"" + scene.title + "\" loaded — hit Send to chain to write this to the blockchain.";
  }
  addEvent("Scenario \"" + scene.title + "\" loaded into form.", "info");
});

updateForm.addEventListener("submit", async e => {
  e.preventDefault();
  await submitState({
    favoriteNumber: Number(numberInput.value),
    lessonMessage:  messageInput.value.trim()
  });
});

// --- Bootstrap ---
async function bootstrap() {
  renderScenarios();
  await loadFoundation();
  await loadHealth();
  try { await loadStorage(); } catch (_) {}
}

bootstrap();
