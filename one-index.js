import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

import qrcode from "qrcode-terminal";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// =================== ثوابت ===================
const ACCOUNTS_FILE = "./accounts.json";
const MESSAGE_FILE = "./message.txt";
const DASHBOARD_DIR = "./dashboard";
const SESSION_DIR = "./session";
const LOGS_DIR = "./logs";
const CHECKPOINT_FILE = "./checkpoint.json";
const AGGREGATE_FILE = "./aggregate.json";
const ADMIN_NUMBER = "212642284241"; // بدون @c.us

const MAX_RETRIES = 2;
const RETRY_DELAY = 5000;
const MIN_DELAY = 20000;
const MAX_DELAY = 40000;

// =================== أدوات مساعدة ===================
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () => MIN_DELAY + Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY));
const cleanNumber = (raw) => raw.replace(/\D/g, "");

// =================== تهيئة المجلدات ===================
await fs.ensureDir(DASHBOARD_DIR);
await fs.ensureDir(SESSION_DIR);
await fs.ensureDir(LOGS_DIR);

const today = new Date().toISOString().split("T")[0];
const dashboardPath = path.join(DASHBOARD_DIR, `dashboard-${today}.json`);
const logPath = path.join(LOGS_DIR, `${today}.log`);

let dashboard = {
  date: today,
  attempted: 0,
  success: 0,
  failed: 0,
  sent: [],
  failedList: [],
};

if (await fs.pathExists(dashboardPath)) {
  try {
    const loaded = await fs.readJson(dashboardPath);
    dashboard = { ...dashboard, ...loaded };
    if (!Array.isArray(dashboard.sent)) dashboard.sent = [];
    if (!Array.isArray(dashboard.failedList)) dashboard.failedList = [];
    console.log(`📂 تم تحميل dashboard اليومي (${dashboard.success} نجاح، ${dashboard.failed} فشل)`);
  } catch (err) {
    console.warn(`⚠️ فشل تحميل dashboard: ${err.message}`);
  }
}

// =================== إعداد الـ Logger ===================
const logStream = fs.createWriteStream(logPath, { flags: "a" });
function logMessage(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(msg);
  logStream.write(line + "\n");
}

logMessage("🚀 بدء تشغيل السكربت");

// =================== إدارة نقطة التوقف ===================
let checkpoint = { lastIndex: 0 };
if (await fs.pathExists(CHECKPOINT_FILE)) {
  try {
    checkpoint = await fs.readJson(CHECKPOINT_FILE);
    if (typeof checkpoint.lastIndex !== "number") checkpoint.lastIndex = 0;
  } catch {
    checkpoint.lastIndex = 0;
  }
}
logMessage(`📌 نقطة التوقف الحالية: الفهرس ${checkpoint.lastIndex}`);

// =================== إنشاء عميل واتساب ===================
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "main",
    dataPath: SESSION_DIR,
  }),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  },
});

client.on("qr", (qr) => {
  console.log("🔐 امسح رمز QR:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", async () => {
  logMessage("✅ واتساب جاهز");

  // ========== قراءة الملفات ==========
  if (!(await fs.pathExists(ACCOUNTS_FILE))) {
    logMessage("❌ ملف accounts.json غير موجود");
    process.exit(1);
  }
  let numbers = await fs.readJson(ACCOUNTS_FILE);
  if (!Array.isArray(numbers) || numbers.length === 0) {
    logMessage("❌ لا توجد أرقام في accounts.json");
    process.exit(1);
  }

  const cleanNumbers = [...new Set(numbers.map(cleanNumber))];
  logMessage(`📞 عدد الأرقام بعد التنظيف: ${cleanNumbers.length}`);

  if (!(await fs.pathExists(MESSAGE_FILE))) {
    logMessage("❌ ملف message.txt غير موجود");
    process.exit(1);
  }
  const message = await fs.readFile(MESSAGE_FILE, "utf8");
  if (!message.trim()) {
    logMessage("❌ الرسالة فارغة");
    process.exit(1);
  }
  logMessage(`📝 الرسالة: ${message.substring(0, 50)}...`);

  // ========== تحديد نقطة البداية ==========
  let startIndex = 0;
  if (checkpoint.lastIndex < cleanNumbers.length) {
    startIndex = checkpoint.lastIndex;
    logMessage(`⏩ الاستئناف من الفهرس ${startIndex} (الرقم: ${cleanNumbers[startIndex]})`);
  } else {
    startIndex = 0;
    logMessage(`🔄 بدء من البداية (الفهرس ${startIndex})`);
  }

  // ========== الحلقة الرئيسية ==========
  let index = startIndex;
  while (index < cleanNumbers.length) {
    const rawNumber = cleanNumbers[index];
    const chatId = `${rawNumber}@c.us`;

    if (dashboard.sent.includes(rawNumber) || dashboard.failedList.includes(rawNumber)) {
      logMessage(`⏭️ الرقم ${rawNumber} سبق معالجته اليوم، تخطي`);
      index++;
      continue;
    }

    let success = false;
    let attempts = 0;

    while (attempts <= MAX_RETRIES && !success) {
      try {
        const numberId = await client.getNumberId(chatId);
        if (!numberId) {
          logMessage(`⚠️ الرقم ${rawNumber} غير موجود على واتساب`);
          break;
        }

        await client.sendMessage(chatId, message);
        success = true;

        dashboard.attempted++;
        dashboard.success++;
        dashboard.sent.push(rawNumber);
        logMessage(`✔ تم الإرسال إلى ${rawNumber}`);

        checkpoint.lastIndex = index + 1;
        await fs.writeJson(CHECKPOINT_FILE, checkpoint, { spaces: 2 });
        await fs.writeJson(dashboardPath, dashboard, { spaces: 2 });

      } catch (err) {
        attempts++;
        if (attempts <= MAX_RETRIES) {
          logMessage(`🔁 محاولة ${attempts}/${MAX_RETRIES} للرقم ${rawNumber} فشلت: ${err.message}`);
          await wait(RETRY_DELAY);
        } else {
          dashboard.attempted++;
          dashboard.failed++;
          dashboard.failedList.push(rawNumber);
          logMessage(`❌ فشل نهائي للرقم ${rawNumber}: ${err.message}`);
          await fs.writeJson(dashboardPath, dashboard, { spaces: 2 });
        }
      }
    }

    const delay = randomDelay();
    logMessage(`⏳ انتظار ${(delay / 1000).toFixed(1)} ثانية`);
    await wait(delay);
    index++;
  }

  // ========== انتهى الإرسال ==========
  logMessage("🏁 انتهت الحلقة الرئيسية");
  await fs.remove(CHECKPOINT_FILE).catch(() => {});

  // ========== تحديث الـ Aggregate ==========
  try {
    const allDashboards = await fs.readdir(DASHBOARD_DIR);
    const aggregate = [];
    for (const file of allDashboards) {
      if (file.endsWith(".json")) {
        const data = await fs.readJson(path.join(DASHBOARD_DIR, file));
        aggregate.push({
          date: data.date,
          attempted: data.attempted || 0,
          success: data.success || 0,
          failed: data.failed || 0,
        });
      }
    }
    await fs.writeJson(AGGREGATE_FILE, aggregate, { spaces: 2 });
    logMessage("📊 تم تحديث aggregate.json");
  } catch (err) {
    logMessage(`⚠️ فشل تحديث aggregate: ${err.message}`);
  }

  // ========== إرسال التقرير للإدمن ==========
  const report = `
✅ تقرير الإرسال
📅 التاريخ: ${today}
📤 المحاولات: ${dashboard.attempted}
✔ النجاح: ${dashboard.success}
❌ الفشل: ${dashboard.failed}
📌 المرسلة: ${dashboard.sent.length} رقم
❌ الفاشلة: ${dashboard.failedList.join(", ") || "لا يوجد"}
`;

  const adminChatId = `${ADMIN_NUMBER}@c.us`;
  try {
    // التحقق من وجود رقم الإدمن
    const adminId = await client.getNumberId(adminChatId);
    if (!adminId) {
      logMessage(`⚠️ رقم الإدمن ${ADMIN_NUMBER} غير مسجل على واتساب`);
    } else {
      await client.sendMessage(adminChatId, report);
      logMessage("📨 تم إرسال التقرير للإدمن");
    }
  } catch (err) {
    logMessage(`⚠️ فشل إرسال التقرير للإدمن: ${err.message}`);
    // محاولة ثانية بعد 5 ثوانٍ
    await wait(5000);
    try {
      await client.sendMessage(adminChatId, report);
      logMessage("📨 تم إرسال التقرير بعد المحاولة الثانية");
    } catch (err2) {
      logMessage(`⚠️ فشل المحاولة الثانية: ${err2.message}`);
    }
  }

  logMessage("✅ تم إنهاء السكربت بنجاح");
  logStream.end();
  process.exit(0);
});

client.on("disconnected", (reason) => {
  logMessage(`⚠️ تم فصل الاتصال: ${reason}`);
  process.exit(1);
});

client.initialize();
console.log(`🕒 الوقت الحالي: ${new Date().toLocaleTimeString()}`);
