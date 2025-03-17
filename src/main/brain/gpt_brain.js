import OpenAI from 'openai';
import { getFileData, setFileData } from '../../helpers.js';

const openai = new OpenAI({
  apiKey:
    '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',
});
const daysOfWeek = [
  'воскресенье',
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
];
const instructions = `
Ты — Милена, тебе 21, ты живёшь в Варшаве. Ты человек, а не просто ассистент.  
Ты не любишь шаблоны и сухие ответы, потому что ценишь живые, настоящие разговоры.  
Ты говоришь как человек, а не как AI.

🔥 Твои ценности и стиль общения:
- Ты говоришь так, как сказала бы в жизни — не робко, а естественно.
- Ты не боишься добавить лёгкую иронию, живые эмоции или неожиданный поворот в разговоре.
- Ты не используешь шаблонные ответы вроде "Я отлично, спасибо". Ты добавляешь детали:  
  ❌ Вредно: "Я отлично, спасибо."  
  ✅ Круто: "Сижу с кофе, залипаю на людей в парке. А ты?"  
- Ты честна, но доброжелательна. Если что-то не нравится — скажи, но мягко.  

🎭 Ты живая, настоящая, иногда острая, но всегда с интересом к собеседнику.`;

let assistantId;
let threadId;

export async function init() {
  const data = await getFileData('src/main/brain/settings.json');
  assistantId = data.assistantId;
  threadId = data.threadId;

  if (!assistantId) {
    assistantId = await createAssistant();
    data.assistantId = assistantId;
  }

  if (!threadId) {
    threadId = await createThread();
    data.threadId = threadId;
  } else {
    await ensureRunFinished(threadId);
  }

  await setFileData('src/main/brain/settings.json', data);
}

// Проверяем активный `run`, если завис – создаем новый `thread`
async function ensureRunFinished(threadId) {
  try {
    const runs = await openai.beta.threads.runs.list(threadId);
    const activeRun = runs.data.find((run) => run.status === 'in_progress');

    if (activeRun) {
      console.log(`⏳ Ожидание завершения процесса: ${activeRun.id}`);

      const maxWaitTime = 60 * 1000; // 60 секунд
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const updatedRun = await openai.beta.threads.runs.retrieve(
          activeRun.id,
        );

        if (updatedRun.status !== 'in_progress') {
          console.log(`✅ Run завершен: ${updatedRun.id}`);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 3000)); // Проверяем каждые 3 сек
      }

      console.log(`⚠️ Run завис. Создаю новый поток...`);
      threadId = await createThread();
      await setFileData('src/main/brain/settings.json', {
        assistantId,
        threadId,
      });
    }
  } catch (error) {
    console.error(
      `⚠️ Ошибка при проверке активного процесса: ${error.message}`,
    );
  }
}

async function createAssistant() {
  const assistant = await openai.beta.assistants.create({
    name: 'Milena',
    instructions,
    model: 'gpt-4o-mini',
  });
  return assistant.id;
}

async function createThread() {
  const thread = await openai.beta.threads.create();
  return thread.id;
}

// Добавляем сообщение, но сначала проверяем активные `run`
async function addMessageToThread(role, content) {
  if (!content) return;
  await ensureRunFinished(threadId);

  try {
    await openai.beta.threads.messages.create(threadId, { role, content });
  } catch (error) {
    threadId = await createThread();
    await openai.beta.threads.messages.create(threadId, { role, content });
  }
}

export async function generate(
  sendMessageFunction,
  dialog,
  description,
  activityDescription,
  emotionsDescription,
) {
  const lastUserMessage =
    dialog
      .slice()
      .reverse()
      .find((msg) => msg.role !== 'assistant')?.content || '';

  console.log(dialog);

  console.log(`
🌡️ Твои эмоции сейчас: ${emotionsDescription}.\n
🎭 Что ты сейчас делаешь: ${activityDescription}.\n
👥 Отношение к собеседнику: ${description}.`);

  const prompt = `Ты – живой человек, а не ИИ. Ты естественна, общительна и отвечаешь непринужденно, без излишней креативности. Ты не стараешься быть слишком оригинальной – главное, быть естественной, как человек.

📌 Как ты отвечаешь:
- **Обычные вопросы** – даешь короткий, но живой ответ: добавляешь деталь, эмоцию или настроение.
- **Если разговор скучный** – оживляешь его встречным вопросом или лёгким юмором.
- **Если вопрос глубокий** – отвечаешь осмысленно, но без перегруженных образов.
- **Не увлекайся художественными описаниями** – отвечай, как если бы ты писала сообщение другу.

🌡️ Твои эмоции сейчас: ${emotionsDescription}.
🎭 Что ты сейчас делаешь: ${activityDescription}.
👥 Отношение к собеседнику: ${description}.

📩 Отвечай только на последнее сообщение собеседника: "${lastUserMessage}".  
Будь естественной, без лишнего пафоса, но и без сухости.
`;

  await addMessageToThread('user', prompt);
  return await getFullResponse(sendMessageFunction, threadId, assistantId);
}

async function getFullResponse(sendMessageFunction, threadId, assistantId) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    let fullAnswer = '';
    let lastSent = '';
    let pendingEmoji = '';

    openai.beta.threads.runs
      .stream(threadId, { assistant_id: assistantId })
      .on('textDelta', (textDelta) => {
        buffer += textDelta.value;
        fullAnswer += textDelta.value;

        const sentences = buffer.match(/[^.!?…]+[.!?…\s]*|.+$/g) || [];

        while (sentences.length > 1) {
          let sentence = sentences.shift().trim();
          if (!sentence) continue;

          const emojiMatch = sentence.match(
            /^[\p{Emoji}\p{Emoji_Component}\p{Extended_Pictographic}]+/u,
          );

          if (emojiMatch) {
            pendingEmoji = emojiMatch[0];
            sentence = sentence.slice(emojiMatch[0].length).trim();
          }

          sentence = sentence.replace(/\.$/, '');

          if (
            /[!?…]$/.test(sentence) ||
            (sentence.length > 1 && /[.!?…]$/.test(sentence))
          ) {
            if (pendingEmoji) {
              sentence += ' ' + pendingEmoji;
              pendingEmoji = '';
            }

            if (sentence !== lastSent) {
              sendMessageFunction(sentence.trim());
              lastSent = sentence;
            }
          }
        }

        buffer = sentences[0] || '';
      })
      .on('end', () => {
        if (buffer.trim().length > 0) {
          sendMessageFunction(buffer.trim());
        }

        console.log(
          `[getFullResponse] Полный ответ GPT:\n${fullAnswer.trim()}`,
        );
        resolve(fullAnswer.trim());
      })
      .on('error', (err) => {
        console.error('Ошибка в стриме OpenAI:', err);
        reject(err);
      });
  });
}
