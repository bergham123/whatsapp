import pkg from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;

import qrcode from "qrcode-terminal";
import fs from "fs-extra";
import path from "path";

const ACCOUNTS_FILE = "./accounts.json";
const MESSAGES_FILE = "./messages.json";
const IMAGES_DIR = "./images";

const DASHBOARD_DIR = "./dashboard";
const SESSION_DIR = "./session";
const AGGREGATE_FILE = "./aggregate.json";

const ADMIN_NUMBER = "212642284241@c.us";

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = () => 20000 + Math.floor(Math.random() * 20000);

await fs.ensureDir(DASHBOARD_DIR);
await fs.ensureDir(SESSION_DIR);

// 📅 اليوم
const today = new Date().toISOString().split("T")[0];
const dashboardPath = `${DASHBOARD_DIR}/dashboard-${today}.json`;

// ⛔ منع التكرار
if (await fs.pathExists(dashboardPath)) {
  console.log("⚠️ Already sent today. Skipping...");
  process.exit(0);
}

// 🕒 التوقيت (المغرب)
const now = new Date();
const moroccoHour = (now.getUTCHours() + 1) % 24;

// ⛔ خارج الوقت (06 → 09)
if (moroccoHour < 19 || moroccoHour >= 21) {
  console.log("⛔ خارج الوقت (06:00 - 09:00)");
  process.exit(0);
}

// 📊 dashboard
const dashboard = {
  date: today,
  total: 0,
  sent: [],
  failed: []
};

// 🚀 client
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

  // 📥 data
  if (!await fs.pathExists(ACCOUNTS_FILE)) {
    throw new Error("accounts.json not found!");
  }

  const numbers = await fs.readJson(ACCOUNTS_FILE);
  const messages = await fs.readJson(MESSAGES_FILE);

  // 📸 images
  const images = await fs.readdir(IMAGES_DIR);
  const validImages = images.filter(img =>
    img.endsWith(".webp") || img.endsWith(".jpg") || img.endsWith(".png")
  );

  if (validImages.length === 0) {
    throw new Error("No images found in /images folder");
  }

  for (const num of numbers) {
    const chatId = `${num}@c.us`;

    const message = messages[Math.floor(Math.random() * messages.length)];

    const randomImage = validImages[Math.floor(Math.random() * validImages.length)];
    const imagePath = path.join(IMAGES_DIR, randomImage);
    const media = MessageMedia.fromFilePath(imagePath);

    try {
      await client.sendMessage(chatId, media, {
        caption: message
      });

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

  // 📤 report
  await client.sendMessage(
    ADMIN_NUMBER,
    `✅ Finished\n📅 ${today}\n📤 Total: ${dashboard.total}`
  );

  process.exit(0);
});

// 🔓 Remove stale Chromium lock files (fixes GitHub Actions profile lock error)
const profileBase = path.join(SESSION_DIR, "session-main", "Default");
const lockFiles = [
  path.join(SESSION_DIR, "session-main", "SingletonLock"),
  path.join(SESSION_DIR, "session-main", "SingletonCookie"),
  path.join(SESSION_DIR, "session-main", "SingletonSocket"),
  path.join(profileBase, "LOCK"),
  path.join(profileBase, "lockfile"),
];
for (const lockFile of lockFiles) {
  if (await fs.pathExists(lockFile)) {
    await fs.remove(lockFile);
    console.log(`🔓 Removed lock file: ${lockFile}`);
  }
}

client.initialize();
