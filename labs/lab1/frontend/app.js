const healthEl = document.getElementById("health");
const cardsEl = document.getElementById("cards");
const nextLabsEl = document.getElementById("nextLabs");
const favoriteNumberEl = document.getElementById("favoriteNumber");
const lessonMessageEl = document.getElementById("lessonMessage");
const contractAddressEl = document.getElementById("contractAddress");
const formStatusEl = document.getElementById("formStatus");

async function getJson(url, options) {
  const response = await fetch(url, options);
  return response.json();
}

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

function renderTimeline(items) {
  nextLabsEl.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

async function loadFoundation() {
  const data = await getJson("http://localhost:3000/api/foundation");
  renderCards(data.cards);
  renderTimeline(data.nextLabs);
}

async function loadHealth() {
  try {
    const data = await getJson("http://localhost:3000/api/health");
    healthEl.textContent = `Chain online | block ${data.blockNumber}`;
    healthEl.className = "status ok";
  } catch (error) {
    healthEl.textContent = "Chain unavailable";
    healthEl.className = "status error";
  }
}

async function loadStorage() {
  const data = await getJson("http://localhost:3000/api/storage");
  if (!data.ok) {
    favoriteNumberEl.textContent = "-";
    lessonMessageEl.textContent = data.message;
    contractAddressEl.textContent = "";
    return;
  }

  favoriteNumberEl.textContent = data.favoriteNumber;
  lessonMessageEl.textContent = data.lessonMessage;
  contractAddressEl.textContent = `Contract address: ${data.contractAddress}`;
}

document.getElementById("refreshButton").addEventListener("click", loadStorage);

document.getElementById("updateForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatusEl.textContent = "Sending transaction...";

  const payload = {
    favoriteNumber: Number(document.getElementById("numberInput").value),
    lessonMessage: document.getElementById("messageInput").value.trim()
  };

  const data = await getJson("http://localhost:3000/api/storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  formStatusEl.textContent = data.ok
    ? `Stored on chain. Tx: ${data.txHash}`
    : `Failed: ${data.message}`;

  if (data.ok) {
    loadStorage();
  }
});

Promise.all([loadFoundation(), loadHealth(), loadStorage()]);
