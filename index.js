import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

import qrcode from "qrcode-terminal";
import fs from "fs-extra";
import path from "path";

const ACCOUNTS_FILE = "./accounts.json";
const MESSAGES_FILE = "./messages.json";
const DASHBOARD_DIR = "./dashboard";
const SESSION_DIR = "./session";
const AGGREGATE_FILE = "./aggregate.json";
const ADMIN_NUMBER = "212642284241@c.us";

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = () => 20000 + Math.floor(Math.random() * 20000);

await fs.ensureDir(DASHBOARD_DIR);
await fs.ensureDir(SESSION_DIR);

// 📅 تاريخ اليوم
const today = new Date().toISOString().split("T")[0];
const dashboardPath = `${DASHBOARD_DIR}/dashboard-${today}.json`;

// ⛔ منع التكرار
if (await fs.pathExists(dashboardPath)) {
  console.log("⚠️ Already sent today. Skipping...");
  process.exit(0);
}

// ⛔ تحقق من الوقت (UTC)
const now = new Date();
const hour = now.getUTCHours();

if (hour < 5 || hour >= 6) {
  console.log("⛔ خارج الوقت المسموح (05:00 - 06:00 UTC)");
  process.exit(0);
}

// 📊 dashboard
const dashboard = {
  date: today,
  total: 0,
  sent: [],
  failed: []
};

// 🚀 WhatsApp client
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

// 🔐 QR
client.on("qr", qr => {
  console.log("🔐 Scan QR:");
  qrcode.generate(qr, { small: true });
});

// ✅ Ready
client.on("ready", async () => {
  console.log("✅ WhatsApp Ready");

  // 📥 قراءة البيانات
  if (!await fs.pathExists(ACCOUNTS_FILE)) {
    throw new Error("accounts.json not found!");
  }

  const numbers = await fs.readJson(ACCOUNTS_FILE);
  const messages = await fs.readJson(MESSAGES_FILE);

  for (const num of numbers) {
    const chatId = `${num}@c.us`;

    // 🎯 message random
    const message = messages[Math.floor(Math.random() * messages.length)];

    try {
      await client.sendMessage(chatId, message);
      dashboard.sent.push(num);
      dashboard.total++;
      console.log(`✔ Sent to ${num}`);
    } catch (err) {
      dashboard.failed.push(num);
      console.log(`❌ Failed ${num} → ${err.message}`);
    }

    const delay = randomDelay();
    console.log(`⏳ Waiting ${delay / 1000}s`);
    await wait(delay);
  }

  // 💾 save dashboard
  await fs.writeJson(dashboardPath, dashboard, { spaces: 2 });
  console.log("📊 Dashboard saved");

  // 📊 aggregate
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

  // 📤 تقرير للـ admin
  await client.sendMessage(
    ADMIN_NUMBER,
    `✅ WhatsApp Automation Finished
📅 Date: ${today}
📤 Total Sent: ${dashboard.total}`
  );

  process.exit(0);
});

client.initialize();
