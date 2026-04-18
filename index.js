import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

import qrcode from "qrcode-terminal";
import fs from "fs-extra";
import path from "path";

const ACCOUNTS_FILE = "./accounts.json";
const MESSAGE_FILE = "./message.json";
const DASHBOARD_DIR = "./dashboard";
const SESSION_DIR = "./session";
const AGGREGATE_FILE = "./aggregate.json";
const ADMIN_NUMBER = "212642284241@c.us";

// ===== Behavior Settings =====
const MIN_DELAY = 15000;   // 15s
const MAX_DELAY = 45000;   // 45s
const BREAK_EVERY = 5;     // take a long break every N messages
const BREAK_TIME = 120000; // 2 minutes
const TYPING_SPEED = 50;   // ms per character

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = () =>
  MIN_DELAY + Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY));

// Avoid repeating same message twice
let lastMessage = null;
function getRandomMessage(messages) {
  let msg;
  do {
    msg = messages[Math.floor(Math.random() * messages.length)];
  } while (messages.length > 1 && msg === lastMessage);

  lastMessage = msg;
  return msg;
}

// Simulate typing behavior
async function sendWithTyping(client, chatId, message) {
  const chat = await client.getChatById(chatId);

  await chat.sendSeen(); // mark as seen
  await chat.sendStateTyping();

  const typingTime = Math.min(5000, message.length * TYPING_SPEED);
  await wait(typingTime);

  await chat.clearState();
  await client.sendMessage(chatId, message);
}

// ===== Setup =====
await fs.ensureDir(DASHBOARD_DIR);
await fs.ensureDir(SESSION_DIR);

const today = new Date().toISOString().split("T")[0];
const dashboardPath = `${DASHBOARD_DIR}/dashboard-${today}.json`;

const dashboard = {
  date: today,
  total: 0,
  sent: [],
  failed: []
};

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "main",
    dataPath: SESSION_DIR
  }),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true
  }
});

client.on("qr", qr => {
  console.log("🔐 Scan QR:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", async () => {
  console.log("✅ WhatsApp Ready");

  if (!await fs.pathExists(ACCOUNTS_FILE)) {
    throw new Error("accounts.json not found!");
  }

  if (!await fs.pathExists(MESSAGE_FILE)) {
    throw new Error("message.json not found!");
  }

  const numbers = await fs.readJson(ACCOUNTS_FILE);
  const messages = await fs.readJson(MESSAGE_FILE);

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("message.json must be a non-empty array");
  }

  let counter = 0;

  for (const num of numbers) {
    const chatId = `${num}@c.us`;

    // Optional personalization (hook)
    const baseMessage = getRandomMessage(messages);
    const message = baseMessage.replace("{number}", num);

    try {
      await sendWithTyping(client, chatId, message);

      dashboard.sent.push(num);
      dashboard.total++;
      console.log(`✔ Sent to ${num}`);
    } catch (err) {
      dashboard.failed.push(num);
      console.log(`❌ Failed ${num} → ${err.message}`);
    }

    counter++;

    // Normal delay
    const delay = randomDelay();
    console.log(`⏳ Waiting ${delay / 1000}s`);
    await wait(delay);

    // Long break simulation
    if (counter % BREAK_EVERY === 0) {
      console.log(`😴 Taking a longer break (${BREAK_TIME / 1000}s)`);
      await wait(BREAK_TIME);
    }
  }

  // Save dashboard
  await fs.writeJson(dashboardPath, dashboard, { spaces: 2 });
  console.log("📊 Dashboard saved");

  // Aggregate
  const allDashboards = await fs.readdir(DASHBOARD_DIR);
  const aggregate = [];

  for (const file of allDashboards) {
    if (file.endsWith(".json")) {
      const data = await fs.readJson(path.join(DASHBOARD_DIR, file));
      aggregate.push({ date: data.date, total: data.total });
    }
  }

  await fs.writeJson(AGGREGATE_FILE, aggregate, { spaces: 2 });
  console.log("📊 Aggregate JSON updated");

  // Admin report
  await client.sendMessage(
    ADMIN_NUMBER,
    `✅ Automation Finished
📅 Date: ${today}
📤 Sent: ${dashboard.total}
❌ Failed: ${dashboard.failed.length}`
  );

  process.exit(0);
});

client.initialize();
