require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const Groq = require("groq-sdk");
const { TELEGRAM_BOT_TOKEN, GROQ_API_KEY, GROQ_MODEL, MAX_HISTORY_LENGTH, SYSTEM_PROMPT } = require("./config");

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const groq = new Groq({ apiKey: GROQ_API_KEY });

const conversationHistory = new Map();

function getHistory(userId) {
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }
  return conversationHistory.get(userId);
}

function addToHistory(userId, role, content) {
  const history = getHistory(userId);
  history.push({ role, content });

  const maxMessages = MAX_HISTORY_LENGTH * 2;
  if (history.length > maxMessages) {
    conversationHistory.set(userId, history.slice(-maxMessages));
  }
}

async function getAIResponse(userId, userMessage) {
  try {
    addToHistory(userId, "user", userMessage);
    const history = getHistory(userId);

    const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const reply = response.choices[0].message.content;
    addToHistory(userId, "assistant", reply);
    return reply;
  } catch (error) {
    console.error("Groq API помилка:", error.message);
    return "❌ Вибач, сталася помилка при зверненні до AI. Спробуй ще раз трохи пізніше.";
  }
}


async function sendLongMessage(chatId, text) {
  if (text.length <= 4000) {
    try {
      await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    } catch {
      await bot.sendMessage(chatId, text); 
    }
    return;
  }
  const parts = text.match(/.{1,4000}/gs) || [text];
  for (const part of parts) {
    try {
      await bot.sendMessage(chatId, part, { parse_mode: "Markdown" });
    } catch {
      await bot.sendMessage(chatId, part);
    }
  }
}

bot.onText(/\/start/, (msg) => {
  const userId = msg.from.id;
  const firstName = msg.from.first_name || "друже";

  conversationHistory.set(userId, []); 

  const text =
    `👋 Привіт, ${firstName}\\! Я — *StudyMate AI* 🎓\n\n` +
    `Я твій особистий навчальний асистент\\! Ось що я вмію:\n\n` +
    `📖 *Пояснюю теми* простими словами\n` +
    `✏️ *Допомагаю з домашніми завданнями* \\(з поясненням\\!\\)\n` +
    `📝 *Роблю підсумки* текстів та статей\n` +
    `💬 *Підтримую діалог* — пам'ятаю контекст розмови\n\n` +
    `Просто напиши мені своє запитання — і ми починаємо\\! 🚀\n\n` +
    `Корисні команди:\n` +
    `/help — список команд\n` +
    `/clear — очистити розмову\n` +
    `/explain — пояснити тему\n` +
    `/summary — підсумок тексту\n` +
    `/homework — допомога з ДЗ`;

  bot.sendMessage(msg.chat.id, text, { parse_mode: "MarkdownV2" });
});

bot.onText(/\/help/, (msg) => {
  const text =
    `📚 *StudyMate AI — Команди*\n\n` +
    `🔹 /start — Почати роботу з ботом\n` +
    `🔹 /help — Показати це меню\n` +
    `🔹 /clear — Очистити історію розмови\n` +
    `🔹 /explain \\[тема\\] — Пояснити тему\n` +
    `🔹 /summary \\[текст\\] — Зробити підсумок\n` +
    `🔹 /homework \\[завдання\\] — Допомога з ДЗ\n\n` +
    `💡 *Приклади:*\n` +
    `_Поясни що таке фотосинтез_\n` +
    `_Допоможи з задачею: знайди x, якщо 2x \\+ 5 \\= 15_\n` +
    `_/summary вставте текст тут_`;

  bot.sendMessage(msg.chat.id, text, { parse_mode: "MarkdownV2" });
});

bot.onText(/\/clear/, (msg) => {
  conversationHistory.set(msg.from.id, []);
  bot.sendMessage(msg.chat.id, "🗑️ Історію розмови очищено\\!\nПочинаємо з чистого аркуша 📄✨", {
    parse_mode: "MarkdownV2",
  });
});

bot.onText(/\/explain(.*)/, async (msg, match) => {
  const topic = match[1].trim();
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!topic) {
    return bot.sendMessage(
      chatId,
      "💡 Вкажи тему після команди\\.\nНаприклад: `/explain закон Ньютона`",
      { parse_mode: "MarkdownV2" }
    );
  }

  await bot.sendMessage(chatId, "⏳ Готую пояснення\\.\\.\\.", { parse_mode: "MarkdownV2" });
  const prompt = `Поясни тему "${topic}" простими словами для учня. Використай приклади з реального життя.`;
  const response = await getAIResponse(userId, prompt);
  await sendLongMessage(chatId, `💡 *${topic}*\n\n${response}`);
});

bot.onText(/\/summary(.*)/, async (msg, match) => {
  const text = match[1].trim();
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!text) {
    return bot.sendMessage(
      chatId,
      "📝 Вкажи текст після команди\\.\nНаприклад: `/summary [вставте текст]`",
      { parse_mode: "MarkdownV2" }
    );
  }

  await bot.sendMessage(chatId, "⏳ Роблю підсумок\\.\\.\\.", { parse_mode: "MarkdownV2" });
  const prompt = `Зроби короткий та зрозумілий підсумок цього тексту. Виділи головні думки:\n\n${text}`;
  const response = await getAIResponse(userId, prompt);
  await sendLongMessage(chatId, `📋 *Підсумок:*\n\n${response}`);
});

bot.onText(/\/homework(.*)/, async (msg, match) => {
  const task = match[1].trim();
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!task) {
    return bot.sendMessage(
      chatId,
      "✏️ Вкажи завдання після команди\\.\nНаприклад: `/homework знайди площу трикутника зі сторонами 3, 4, 5`",
      { parse_mode: "MarkdownV2" }
    );
  }

  await bot.sendMessage(chatId, "⏳ Розбираю завдання\\.\\.\\.", { parse_mode: "MarkdownV2" });
  const prompt = `Допоможи з домашнім завданням. Спочатку поясни теорію, потім покажи розв'язання з поясненням кожного кроку:\n\n${task}`;
  const response = await getAIResponse(userId, prompt);
  await sendLongMessage(chatId, `📚 *Рішення:*\n\n${response}`);
});

bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;

  await bot.sendChatAction(chatId, "typing");

  const response = await getAIResponse(userId, msg.text);
  await sendLongMessage(chatId, response);
});

bot.on("polling_error", (error) => {
  console.error("Polling помилка:", error.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("Необроблена помилка:", reason);
});

console.log("🎓 StudyMate AI запущено! Натисни Ctrl+C для зупинки.");
