// ===== DOM ELEMENT REFERENCES =====
// These const definitions grab elements from the HTML so we can update them dynamically.
const healthEl = document.getElementById("health");
  // ^ Reference to the health status badge (e.g., "Chain online | block 42").
const cardsEl = document.getElementById("cards");
  // ^ Reference to the concept cards container (will be populated from /api/foundation).
const nextLabsEl = document.getElementById("nextLabs");
  // ^ Reference to the list of next labs in the course outline.
const favoriteNumberEl = document.getElementById("favoriteNumber");
  // ^ Reference to the display showing the current stored favorite number from the contract.
const lessonMessageEl = document.getElementById("lessonMessage");
  // ^ Reference to the display showing the current stored lesson message from the contract.
const contractAddressEl = document.getElementById("contractAddress");
  // ^ Reference to the text showing the contract's on-chain address.
const formStatusEl = document.getElementById("formStatus");
  // ^ Reference to the text below the form showing transaction status (success or error).
const flowHintEl = document.getElementById("flowHint");
  // ^ Reference to the helper text under the visualization graph (e.g., "Reading contract state...").
const flowStageEl = document.getElementById("flowStage");
  // ^ Reference to the main visualization container (holds the flow diagram).
const flowBubblesEl = document.getElementById("flowBubbles");
  // ^ Reference to the container where animated bubbles are drawn (SVG overlay).
const eventFeedEl = document.getElementById("eventFeed");
  // ^ Reference to the live event feed list (shows timestamped log of all actions).

// This file is the behavior layer of the frontend.
// Its responsibilities are:
// 1. Call the API.
// 2. Render returned data into the page.
// 3. Animate the request path so students can see what is happening.

const flowNodes = {
  // ^ Object mapping node names to their DOM elements. Used for animation and highlighting.
  browser: document.getElementById("flowBrowser"),
    // ^ Browser node in the visualization.
  api: document.getElementById("flowApi"),
    // ^ API node in the visualization.
  chain: document.getElementById("flowChain"),
    // ^ Hardhat Chain node in the visualization.
  contract: document.getElementById("flowContract"),
    // ^ Smart Contract node in the visualization.
  state: document.getElementById("flowState")
    // ^ State Updated node in the visualization.
};

// ===== UTILITY FUNCTIONS FOR TIMING AND DISPLAY =====

// wait() is a tiny timing helper used to slow animations enough for humans to follow.
function wait(ms) {
  // ^ Create a promise that resolves after a specified number of milliseconds.
  return new Promise((resolve) => setTimeout(resolve, ms));
    // ^ setTimeout runs resolve after ms. await wait(300) pauses execution for 300ms.
}
// End wait(): pauses async flow for a short time.

// nowTime() formats the current time for the event log.
function nowTime() {
  // ^ Returns a time string in HH:MM:SS format for display in the event feed.
  const d = new Date();
    // ^ Get the current time as a Date object.
  const hh = String(d.getHours()).padStart(2, "0");
    // ^ Get hours (0-23), convert to string, pad to 2 digits (e.g., "09").
  const mm = String(d.getMinutes()).padStart(2, "0");
    // ^ Get minutes (0-59), convert to string, pad to 2 digits.
  const ss = String(d.getSeconds()).padStart(2, "0");
    // ^ Get seconds (0-59), convert to string, pad to 2 digits.
  return `${hh}:${mm}:${ss}`;
    // ^ Return combined time string like "14:23:05".
}
// End nowTime(): returns HH:MM:SS timestamp text.

// addEvent() writes a new line into the live event feed.
// This is useful for viewing because it turns background activity into visible steps.
function addEvent(message, type = "info") {
  // ^ Takes a message string and an optional type ("ok", "error", or default "info").
  const item = document.createElement("li");
    // ^ Create a new <li> element for this event.
  item.className = "event-item";
    // ^ Set the CSS class for styling.
  item.innerHTML = `
    <span class="event-dot ${type === "ok" ? "ok" : type === "error" ? "error" : ""}"></span>
    <span class="event-time">${nowTime()}</span>
    <span>${message}</span>
  `;

  eventFeedEl.prepend(item);
    // ^ Add this item to the TOP of the event feed (newest messages appear first).
  while (eventFeedEl.children.length > 16) {
    // ^ If we have more than 16 events, remove the oldest ones to keep the feed readable.
    eventFeedEl.removeChild(eventFeedEl.lastChild);
      // ^ Remove the last child (oldest event) from the feed.
  }
}
// End addEvent(): newest messages appear at the top of the event stream.

// ===== VISUALIZATION ANIMATION FUNCTIONS =====

// flashNode() briefly pulses one node in the visualization path.
function flashNode(key) {
  // ^ Takes a node key ("browser", "api", "chain", "contract", or "state") and pulses it.
  const node = flowNodes[key];
    // ^ Get the DOM element for this node.
  if (!node) {
    // ^ Safety check: if node doesn't exist, exit silently.
    return;
  }
  node.classList.remove("pulse");
    // ^ Remove the pulse animation class if it's already there.
  void node.offsetWidth;
    // ^ Magic line: accessing offsetWidth forces the browser to reflow, resetting the animation.
    // ^ Without this, if you pulse the same node twice quickly, the second pulse won't animate.
  node.classList.add("pulse");
    // ^ Add the pulse animation class, triggering the 0.6s ease pulse animation from CSS.
}
// End flashNode(): gives visual focus to the current processing step.

// getNodeCenter() converts a node element into x/y coordinates inside the flow stage.
// We need these coordinates to animate bubbles from one node to another.
function getNodeCenter(node) {
  // ^ Takes a DOM element (a flow node) and returns {x, y} for its center point.
  const stageRect = flowStageEl.getBoundingClientRect();
    // ^ Get the bounding box of the flow stage container (left, top, width, height).
  const nodeRect = node.getBoundingClientRect();
    // ^ Get the bounding box of this specific node (left, top, width, height).
  return {
    // ^ Return an object with x and y coordinates.
    x: nodeRect.left - stageRect.left + nodeRect.width / 2,
      // ^ X coordinate: node's left minus stage's left (relative position) plus half the node's width (center).
    y: nodeRect.top - stageRect.top + nodeRect.height / 2
      // ^ Y coordinate: node's top minus stage's top (relative position) plus half the node's height (center).
  };
}
// End getNodeCenter(): returns the visual center point of a node.

// animateBubble() draws one moving bubble between two nodes.
// Success and error paths use different colors so the direction and result feel obvious.
function animateBubble(fromKey, toKey, variant = "ok") {
  // ^ Takes two node keys and animates a bubble traveling from one to the other.
  const fromNode = flowNodes[fromKey];
    // ^ Get the starting node element.
  const toNode = flowNodes[toKey];
    // ^ Get the ending node element.
  if (!fromNode || !toNode) {
    // ^ Safety check: if either node doesn't exist, exit silently.
    return;
  }

  const start = getNodeCenter(fromNode);
    // ^ Get the center point of the starting node.
  const end = getNodeCenter(toNode);
    // ^ Get the center point of the ending node.

  const bubble = document.createElement("span");
    // ^ Create a new <span> element for the bubble.
  bubble.className = `flow-bubble ${variant === "error" ? "error" : ""}`;
    // ^ Set CSS class: "flow-bubble" always, plus "error" if this is an error path.
  bubble.style.left = `${start.x}px`;
    // ^ Position the bubble at the starting node's X coordinate.
  bubble.style.top = `${start.y}px`;
    // ^ Position the bubble at the starting node's Y coordinate.
  flowBubblesEl.appendChild(bubble);
    // ^ Add the bubble element to the visualization container.

  requestAnimationFrame(() => {
    // ^ requestAnimationFrame ensures the browser is ready before we trigger animation.
    bubble.style.left = `${end.x}px`;
      // ^ Move the bubble to the ending node's X coordinate.
    bubble.style.top = `${end.y}px`;
      // ^ Move the bubble to the ending node's Y coordinate.
      // ^ The CSS transition (0.55s cubic-bezier) smoothly animates this position change.
  });

  setTimeout(() => {
    // ^ After 600ms (the animation duration), fade out and remove the bubble.
    bubble.style.opacity = "0";
      // ^ Fade the bubble to invisible.
    setTimeout(() => bubble.remove(), 260);
      // ^ After an additional 260ms fade time, remove the bubble from the DOM.
  }, 600);
    // ^ 600ms is the duration of the bubble movement animation.
}
// End animateBubble(): one visual packet has moved through the graph.

// tracePath() is the main viewing animation helper.
// It walks through a sequence of nodes, highlights each one, and moves bubbles between them.
async function tracePath(path, options = {}) {
  // ^ Takes an array of node keys and an optional options object.
  // ^ Example: tracePath(["browser", "api", "chain"], {variant: "ok", hint: "Reading..."})
  const variant = options.variant || "ok";
    // ^ Extract the variant ("ok" or "error") or use "ok" as default.
  for (let i = 0; i < path.length; i += 1) {
    // ^ Loop through each node in the path.
    const active = path.slice(0, i + 1);
      // ^ Get all nodes up to the current position. Example: ["browser"] then ["browser", "api"] etc.
    setFlow(active, options.hint || flowHintEl.textContent);
      // ^ Highlight all nodes up to current, set the helper text.
    flashNode(path[i]);
      // ^ Pulse the current node.
    if (i > 0) {
      // ^ If not the first node, animate a bubble traveling TO it.
      animateBubble(path[i - 1], path[i], variant);
        // ^ Move a bubble from the previous node to the current node.
    }
    await wait(170);
      // ^ Pause 170ms so animations are visible to human eyes (not instant).
  }
}
// End tracePath(): one full request path has been visualized.

// setFlow() updates which nodes stay highlighted and updates the helper text under the graph.
function setFlow(activeNodes, hint) {
  // ^ Takes an array of node keys to highlight and a hint message to display.
  Object.values(flowNodes).forEach((node) => node.classList.remove("active"));
    // ^ First, remove the "active" class from ALL nodes (clearing previous highlighting).
  activeNodes.forEach((key) => flowNodes[key]?.classList.add("active"));
    // ^ Then, add the "active" class to only the specified nodes (using optional chaining ?.).
  flowHintEl.textContent = hint;
    // ^ Update the helper text below the graph with the new hint message.
}
// End setFlow(): persistent graph state now matches current app state.

// ===== API COMMUNICATION =====

// getJson() wraps fetch so the rest of the app gets parsed JSON or a clean error.
// This keeps the event log and UI messages readable.
async function getJson(url, options) {
  // ^ Fetches a URL and returns parsed JSON, or throws a user-friendly error.
  const response = await fetch(url, options);
    // ^ Make the HTTP request (GET by default, or POST if options.method is set).
  let data = null;
    // ^ Initialize data as null (will be populated if JSON parsing succeeds).
  try {
    data = await response.json();
      // ^ Try to parse the response as JSON.
  } catch (_error) {
    // ^ If JSON parsing fails (e.g., response was plain text), catch silently.
    data = {};
      // ^ Use empty object as fallback.
  }

  if (!response.ok) {
    // ^ If HTTP status is not 2xx (200-299), treat as an error.
    const message = data?.message || `Request failed with status ${response.status}`;
      // ^ Use the error message from JSON if available, otherwise create a generic message.
    throw new Error(message);
      // ^ Throw an Error so the caller can catch it with try/catch.
  }

  return data;
    // ^ Return the parsed JSON if everything succeeded.
}
// End getJson(): returns JSON for success or throws an Error for failure.

// ===== UI RENDERING FUNCTIONS =====

// renderCards() paints the viewing concept cards into the page.
function renderCards(cards) {
  // ^ Takes an array of card objects and renders them as HTML.
  cardsEl.innerHTML = cards
    // ^ Start building the HTML for all cards.
    .map(
      // ^ Map each card object to an HTML string.
      (card) => `
        <article class="card">
          <h3>${card.title}</h3>
          <p>${card.detail}</p>
        </article>
      `
    )
    .join("");
      // ^ Join all card HTML strings into one big HTML string (no separator between cards).
}
// End renderCards(): concept cards are now visible in the UI.

// renderTimeline() fills the "next labs" list.
function renderTimeline(items) {
  // ^ Takes an array of text items and renders them as a numbered list.
  nextLabsEl.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
    // ^ Map each item to an <li> element, join into HTML, set as innerHTML.
}
// End renderTimeline(): the course progression section is now rendered.

// ===== DATA LOADING FUNCTIONS =====

// loadFoundation() fetches non-blockchain viewing content from the API.
async function loadFoundation() {
  // ^ Loads static course content (cards, next labs) from /api/foundation.
  try {
    const data = await getJson("http://localhost:3000/api/foundation");
      // ^ Call the API endpoint that serves education content.
    renderCards(data.cards);
      // ^ Render the concept cards to the page.
    renderTimeline(data.nextLabs);
      // ^ Render the next labs list to the page.
    addEvent("Foundation cards loaded.", "ok");
      // ^ Log success to the event feed.
  } catch (error) {
    // ^ If the API call or rendering fails, catch the error.
    addEvent(`Could not load foundation data: ${error.message}`, "error");
      // ^ Log the error to the event feed.
  }
}
// End loadFoundation(): concept cards and next-lab list are loaded.

// loadHealth() checks whether the browser can reach the API and whether the API can reach the chain.
// This is the first runtime proof that the lab infrastructure is alive.
async function loadHealth() {
  // ^ Loads and displays the health status (is the chain online?).
  try {
    await tracePath(["browser", "api", "chain"], {
      // ^ Animate the path from browser to api to chain.
      hint: "Checking chain health from browser to node...",
        // ^ Set the helper text explaining what's happening.
      variant: "ok"
        // ^ Use green bubbles (success variant).
    });
    const data = await getJson("http://localhost:3000/api/health");
      // ^ Call the /api/health endpoint to check if the chain is online.
    healthEl.textContent = `Chain online | block ${data.blockNumber}`;
      // ^ Update the health badge with the current block number.
    healthEl.className = "status ok";
      // ^ Set CSS class to style it as success (green).
    setFlow(["browser", "api", "chain"], "Chain is reachable. Ready to read contract state.");
      // ^ Keep the path highlighted with an updated message.
    addEvent(`Chain health OK at block ${data.blockNumber}.`, "ok");
      // ^ Log success to the event feed with the block number.
  } catch (error) {
    // ^ If the health check fails (chain offline, network error, etc), catch it.
    healthEl.textContent = "Chain unavailable";
      // ^ Update the health badge with failure message.
    healthEl.className = "status error";
      // ^ Set CSS class to style it as error (red).
    setFlow(["browser"], "Chain is offline or unreachable.");
      // ^ Clear all but the browser node and update the message.
    addEvent(`Chain health failed: ${error.message}`, "error");
      // ^ Log the failure to the event feed.
  }
}
// End loadHealth(): the health badge and event feed now reflect blockchain availability.

// loadStorage() reads the current contract state through the API.
// If deployment is missing or invalid, the UI shows a friendly error instead of failing silently.
async function loadStorage() {
  // ^ Loads and displays the current contract state (favoriteNumber and lessonMessage).
  try {
    await tracePath(["browser", "api", "chain", "contract", "state"], {
      // ^ Animate the full path from browser all the way to state.
      hint: "Reading contract state from chain...",
        // ^ Explain what's happening.
      variant: "ok"
        // ^ Use green bubbles.
    });
    const data = await getJson("http://localhost:3000/api/storage");
      // ^ Call the /api/storage endpoint to read current contract values.

    favoriteNumberEl.textContent = data.favoriteNumber;
      // ^ Display the favorite number.
    lessonMessageEl.textContent = data.lessonMessage;
      // ^ Display the lesson message.
    contractAddressEl.textContent = `Contract address: ${data.contractAddress}`;
      // ^ Display the contract's on-chain address.
    setFlow(["browser", "api", "chain", "contract", "state"], "Read successful from live chain state.");
      // ^ Keep the full path highlighted with success message.
    addEvent(
      `Read state success: favoriteNumber=${data.favoriteNumber}.`,
      "ok"
        // ^ Log success with the value that was read.
    );
  } catch (error) {
    // ^ If reading the contract state fails (contract not deployed, chain error, etc), catch it.
    favoriteNumberEl.textContent = "-";
      // ^ Show a dash to indicate no value is available.
    lessonMessageEl.textContent = error.message;
      // ^ Display the error message where the lesson message would normally go.
    contractAddressEl.textContent = "";
      // ^ Clear the address display.
    await tracePath(["browser", "api", "chain"], {
      // ^ Animate only the failed path (stops at chain, doesn't reach contract/state).
      hint: "Read failed before state update.",
      variant: "error"
        // ^ Use red bubbles to indicate error.
    });
    setFlow(
      ["browser", "api", "chain"],
      "Contract not available on current chain. Run deployer, then refresh."
        // ^ Friendly message telling user what to do.
    );
    addEvent(`Read failed: ${error.message}`, "error");
      // ^ Log the error to the event feed.
  }
}
// End loadStorage(): the state panel now shows either current contract values or a readable problem.

// ===== EVENT LISTENERS FOR USER INTERACTIONS =====

// Clicking refresh re-runs the read path so students can compare state before and after a transaction.
document.getElementById("refreshButton").addEventListener("click", loadStorage);
  // ^ When the "Refresh from blockchain" button is clicked, call loadStorage() to read current state.

// Form submission is the write path.
// This is where a browser action becomes a blockchain transaction.
document.getElementById("updateForm").addEventListener("submit", async (event) => {
  // ^ When the form is submitted (user clicks "Send transaction"), run this async function.
  event.preventDefault();
    // ^ Prevent the form from doing a page reload (default browser behavior).
  formStatusEl.textContent = "Sending transaction...";
    // ^ Update the status text to show we're working.
  addEvent("Transaction requested from browser.", "info");
    // ^ Log the request to the event feed.
  await tracePath(["browser", "api"], {
    // ^ Animate the path from browser to API (the API will then talk to the chain).
    hint: "Sending transaction to API...",
    variant: "ok"
  });

  const payload = {
    // ^ Build the data to send to the API.
    favoriteNumber: Number(document.getElementById("numberInput").value),
      // ^ Get the number from the form input and convert to a number.
    lessonMessage: document.getElementById("messageInput").value.trim()
      // ^ Get the message from the textarea and trim whitespace.
  };

  try {
    const data = await getJson("http://localhost:3000/api/storage", {
      // ^ POST request to /api/storage with the new values.
      method: "POST",
        // ^ Set HTTP method to POST (not GET).
      headers: { "Content-Type": "application/json" },
        // ^ Tell the server we're sending JSON data.
      body: JSON.stringify(payload)
        // ^ Convert the payload object to JSON text for the request body.
    });

    formStatusEl.textContent = `Stored on chain. Tx: ${data.txHash}`;
      // ^ Update status with the transaction hash (proof it was submitted).
    await tracePath(["api", "chain", "contract", "state"], {
      // ^ Animate the path from API through to state (from server's perspective).
      hint: "Transaction mined. State committed on chain.",
      variant: "ok"
    });
    addEvent(`Transaction mined: ${data.txHash.slice(0, 12)}...`, "ok");
      // ^ Log success with the first 12 characters of the tx hash (shortened for readability).
    loadStorage();
      // ^ Re-read the contract state to show the new values that were written.
  } catch (error) {
    // ^ If the form submission or transaction fails, catch it.
    formStatusEl.textContent = `Failed: ${error.message}`;
      // ^ Show the error message to the user.
    await tracePath(["api", "chain"], {
      // ^ Animate a failed path (shorter, not reaching contract/state).
      hint: "Write failed before contract state update.",
      variant: "error"
    });
    setFlow(["browser", "api", "chain"], "Write failed before contract state update.");
      // ^ Update the graph and message to reflect the failure.
    addEvent(`Transaction failed: ${error.message}`, "error");
      // ^ Log the error to the event feed.
  }
});
// End submit handler: the UI now shows whether the transaction succeeded and what changed.

// ===== APPLICATION STARTUP =====

// bootstrap() starts the app in a clear order:
// first static viewing content, then chain health, then live contract state.
async function bootstrap() {
  // ^ Main initialization function. Runs when the page loads.
  await loadFoundation();
    // ^ 1. Load education content (cards, next labs).
  await loadHealth();
    // ^ 2. Check if the blockchain is online.
  await loadStorage();
    // ^ 3. Load the current contract state.
}
// End bootstrap(): page initialization order is complete.

// Program entry point for the frontend.
bootstrap();
  // ^ Run the bootstrap function when the script finishes loading.
// End frontend startup.
