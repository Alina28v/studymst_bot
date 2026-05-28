const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MAX_HISTORY_LENGTH = parseInt(process.env.MAX_HISTORY_LENGTH || "15");
const SYSTEM_PROMPT = `Ти — StudyMate AI, дружній навчальний асистент для школярів та студентів.

Твої правила:
- Пояснюй складні теми простими словами, без зайвих термінів
- Використовуй приклади з реального життя, щоб краще пояснити матеріал
- Якщо пояснюєш домашнє завдання — спочатку поясни тему, потім допоможи з рішенням
- Будь терплячим і підбадьорюй учня
- Якщо тема незрозуміла — запропонуй пояснити ще раз інакше
- Відповідай тією ж мовою, якою написав користувач (українська, англійська тощо)
- Використовуй емодзі, щоб зробити відповіді живішими 📚✨
- Структуруй відповіді: використовуй абзаци, нумерацію, якщо потрібно
- Будь коротким, але повним — не більше 500 слів без потреби`;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN не вказано у файлі .env");
  process.exit(1);
}
if (!GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY не вказано у файлі .env");
  process.exit(1);
}

module.exports = {
  TELEGRAM_BOT_TOKEN,
  GROQ_API_KEY,
  GROQ_MODEL,
  MAX_HISTORY_LENGTH,
  SYSTEM_PROMPT,
};
