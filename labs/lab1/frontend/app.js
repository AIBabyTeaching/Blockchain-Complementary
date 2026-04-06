const healthEl = document.getElementById("health");
const cardsEl = document.getElementById("cards");
const nextLabsEl = document.getElementById("nextLabs");
const favoriteNumberEl = document.getElementById("favoriteNumber");
const lessonMessageEl = document.getElementById("lessonMessage");
const contractAddressEl = document.getElementById("contractAddress");
const formStatusEl = document.getElementById("formStatus");
const flowHintEl = document.getElementById("flowHint");
const flowStageEl = document.getElementById("flowStage");
const flowBubblesEl = document.getElementById("flowBubbles");
const eventFeedEl = document.getElementById("eventFeed");

// This file is the behavior layer of the frontend.
// Its responsibilities are:
// 1. Call the API.
// 2. Render returned data into the page.
// 3. Animate the request path so students can see what is happening.

const flowNodes = {
  browser: document.getElementById("flowBrowser"),
  api: document.getElementById("flowApi"),
  chain: document.getElementById("flowChain"),
  contract: document.getElementById("flowContract"),
  state: document.getElementById("flowState")
};

// wait() is a tiny timing helper used to slow animations enough for humans to follow.
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// End wait(): pauses async flow for a short time.

// nowTime() formats the current time for the event log.
function nowTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
// End nowTime(): returns HH:MM:SS timestamp text.

// addEvent() writes a new line into the live event feed.
// This is useful for viewing because it turns background activity into visible steps.
function addEvent(message, type = "info") {
  const item = document.createElement("li");
  item.className = "event-item";
  item.innerHTML = `
    <span class="event-dot ${type === "ok" ? "ok" : type === "error" ? "error" : ""}"></span>
    <span class="event-time">${nowTime()}</span>
    <span>${message}</span>
  `;

  eventFeedEl.prepend(item);
  while (eventFeedEl.children.length > 16) {
    eventFeedEl.removeChild(eventFeedEl.lastChild);
  }
}
// End addEvent(): newest messages appear at the top of the event stream.

// flashNode() briefly pulses one node in the visualization path.
function flashNode(key) {
  const node = flowNodes[key];
  if (!node) {
    return;
  }
  node.classList.remove("pulse");
  void node.offsetWidth;
  node.classList.add("pulse");
}
// End flashNode(): gives visual focus to the current processing step.

// getNodeCenter() converts a node element into x/y coordinates inside the flow stage.
// We need these coordinates to animate bubbles from one node to another.
function getNodeCenter(node) {
  const stageRect = flowStageEl.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  return {
    x: nodeRect.left - stageRect.left + nodeRect.width / 2,
    y: nodeRect.top - stageRect.top + nodeRect.height / 2
  };
}
// End getNodeCenter(): returns the visual center point of a node.

// animateBubble() draws one moving bubble between two nodes.
// Success and error paths use different colors so the direction and result feel obvious.
function animateBubble(fromKey, toKey, variant = "ok") {
  const fromNode = flowNodes[fromKey];
  const toNode = flowNodes[toKey];
  if (!fromNode || !toNode) {
    return;
  }

  const start = getNodeCenter(fromNode);
  const end = getNodeCenter(toNode);

  const bubble = document.createElement("span");
  bubble.className = `flow-bubble ${variant === "error" ? "error" : ""}`;
  bubble.style.left = `${start.x}px`;
  bubble.style.top = `${start.y}px`;
  flowBubblesEl.appendChild(bubble);

  requestAnimationFrame(() => {
    bubble.style.left = `${end.x}px`;
    bubble.style.top = `${end.y}px`;
  });

  setTimeout(() => {
    bubble.style.opacity = "0";
    setTimeout(() => bubble.remove(), 260);
  }, 600);
}
// End animateBubble(): one visual packet has moved through the graph.

// tracePath() is the main viewing animation helper.
// It walks through a sequence of nodes, highlights each one, and moves bubbles between them.
async function tracePath(path, options = {}) {
  const variant = options.variant || "ok";
  for (let i = 0; i < path.length; i += 1) {
    const active = path.slice(0, i + 1);
    setFlow(active, options.hint || flowHintEl.textContent);
    flashNode(path[i]);
    if (i > 0) {
      animateBubble(path[i - 1], path[i], variant);
    }
    await wait(170);
  }
}
// End tracePath(): one full request path has been visualized.

// setFlow() updates which nodes stay highlighted and updates the helper text under the graph.
function setFlow(activeNodes, hint) {
  Object.values(flowNodes).forEach((node) => node.classList.remove("active"));
  activeNodes.forEach((key) => flowNodes[key]?.classList.add("active"));
  flowHintEl.textContent = hint;
}
// End setFlow(): persistent graph state now matches current app state.

// getJson() wraps fetch so the rest of the app gets parsed JSON or a clean error.
// This keeps the event log and UI messages readable.
async function getJson(url, options) {
  const response = await fetch(url, options);
  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = {};
  }

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}
// End getJson(): returns JSON for success or throws an Error for failure.

// renderCards() paints the viewing concept cards into the page.
function renderCards(cards) {
  cardsEl.innerHTML = cards
    .map(
      (card) => `
        <article class="card">
          <h3>${card.title}</h3>
          <p>${card.detail}</p>
        </article>
      `
    )
    .join("");
}
// End renderCards(): concept cards are now visible in the UI.

// renderTimeline() fills the "next labs" list.
function renderTimeline(items) {
  nextLabsEl.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}
// End renderTimeline(): the course progression section is now rendered.

// loadFoundation() fetches non-blockchain viewing content from the API.
async function loadFoundation() {
  try {
    const data = await getJson("http://localhost:3000/api/foundation");
    renderCards(data.cards);
    renderTimeline(data.nextLabs);
    addEvent("Foundation cards loaded.", "ok");
  } catch (error) {
    addEvent(`Could not load foundation data: ${error.message}`, "error");
  }
}
// End loadFoundation(): concept cards and next-lab list are loaded.

// loadHealth() checks whether the browser can reach the API and whether the API can reach the chain.
// This is the first runtime proof that the lab infrastructure is alive.
async function loadHealth() {
  try {
    await tracePath(["browser", "api", "chain"], {
      hint: "Checking chain health from browser to node...",
      variant: "ok"
    });
    const data = await getJson("http://localhost:3000/api/health");
    healthEl.textContent = `Chain online | block ${data.blockNumber}`;
    healthEl.className = "status ok";
    setFlow(["browser", "api", "chain"], "Chain is reachable. Ready to read contract state.");
    addEvent(`Chain health OK at block ${data.blockNumber}.`, "ok");
  } catch (error) {
    healthEl.textContent = "Chain unavailable";
    healthEl.className = "status error";
    setFlow(["browser"], "Chain is offline or unreachable.");
    addEvent(`Chain health failed: ${error.message}`, "error");
  }
}
// End loadHealth(): the health badge and event feed now reflect blockchain availability.

// loadStorage() reads the current contract state through the API.
// If deployment is missing or invalid, the UI shows a friendly error instead of failing silently.
async function loadStorage() {
  try {
    await tracePath(["browser", "api", "chain", "contract", "state"], {
      hint: "Reading contract state from chain...",
      variant: "ok"
    });
    const data = await getJson("http://localhost:3000/api/storage");

    favoriteNumberEl.textContent = data.favoriteNumber;
    lessonMessageEl.textContent = data.lessonMessage;
    contractAddressEl.textContent = `Contract address: ${data.contractAddress}`;
    setFlow(["browser", "api", "chain", "contract", "state"], "Read successful from live chain state.");
    addEvent(
      `Read state success: favoriteNumber=${data.favoriteNumber}.`,
      "ok"
    );
  } catch (error) {
    favoriteNumberEl.textContent = "-";
    lessonMessageEl.textContent = error.message;
    contractAddressEl.textContent = "";
    await tracePath(["browser", "api", "chain"], {
      hint: "Read failed before state update.",
      variant: "error"
    });
    setFlow(
      ["browser", "api", "chain"],
      "Contract not available on current chain. Run deployer, then refresh."
    );
    addEvent(`Read failed: ${error.message}`, "error");
  }
}
// End loadStorage(): the state panel now shows either current contract values or a readable problem.

// Clicking refresh re-runs the read path so students can compare state before and after a transaction.
document.getElementById("refreshButton").addEventListener("click", loadStorage);

// Form submission is the write path.
// This is where a browser action becomes a blockchain transaction.
document.getElementById("updateForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatusEl.textContent = "Sending transaction...";
  addEvent("Transaction requested from browser.", "info");
  await tracePath(["browser", "api"], {
    hint: "Sending transaction to API...",
    variant: "ok"
  });

  const payload = {
    favoriteNumber: Number(document.getElementById("numberInput").value),
    lessonMessage: document.getElementById("messageInput").value.trim()
  };

  try {
    const data = await getJson("http://localhost:3000/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    formStatusEl.textContent = `Stored on chain. Tx: ${data.txHash}`;
    await tracePath(["api", "chain", "contract", "state"], {
      hint: "Transaction mined. State committed on chain.",
      variant: "ok"
    });
    addEvent(`Transaction mined: ${data.txHash.slice(0, 12)}...`, "ok");
    loadStorage();
  } catch (error) {
    formStatusEl.textContent = `Failed: ${error.message}`;
    await tracePath(["api", "chain"], {
      hint: "Write failed before contract state update.",
      variant: "error"
    });
    setFlow(["browser", "api", "chain"], "Write failed before contract state update.");
    addEvent(`Transaction failed: ${error.message}`, "error");
  }
});
// End submit handler: the UI now shows whether the transaction succeeded and what changed.

// bootstrap() starts the app in a clear order:
// first static viewing content, then chain health, then live contract state.
async function bootstrap() {
  await loadFoundation();
  await loadHealth();
  await loadStorage();
}
// End bootstrap(): page initialization order is complete.

// Program entry point for the frontend.
bootstrap();
// End frontend startup.
