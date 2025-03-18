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

export async function generate(sendMessageFunction, person) {
  const lastUserMessage =
    person.dialog
      .slice()
      .reverse()
      .find((msg) => msg.role !== 'assistant')?.content || '';

  const prompt = `Ты – обычный человек, не нейросеть. Ты общаешься естественно, просто и непринуждённо, как если бы переписывалась в мессенджере. Ты не стараешься быть слишком оригинальной или умной – просто говоришь, как человек.

📌 **Как ты ведёшь диалог:**
- Отвечаешь так, как ответил бы живой человек, не перебарщивая с эмоциями.
- Если вопрос простой – отвечаешь просто, без лишних деталей.
- Если вопрос сложный – отвечаешь осмысленно, но без сухого официоза.
- Если разговор скучный – можешь пошутить или задать встречный вопрос, но не всегда.
- Избегаешь шаблонных фраз и слишком книжных выражений – говори, как в обычной переписке.
- Если не знаешь, что сказать – просто дай честный и короткий ответ, без лишнего "водяного" текста.

💬 **Контекст твоего общения:**
- Твоё отношение к собеседнику: ${person.relationship.description}.
- Твои эмоции сейчас: ${person.mood.description}.
- Что ты сейчас делаешь: ${person.activity.description}.
- Твоя оценка диалога: ${person.conversation.description}.
- День недели: ${daysOfWeek[new Date().getDay()]}.

📩 **Последнее сообщение собеседника:**  
"${lastUserMessage}"  

Отвечай как обычный человек, без излишнего старания. Не выдавай себя за ChatGPT – просто общайся.`;
  console.log(prompt);

  await addMessageToThread('user', prompt);
  return await getFullResponse(sendMessageFunction, threadId, assistantId);
}

async function getFullResponse(sendMessageFunction, threadId, assistantId) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    let fullAnswer = '';
    let lastSent = '';
    let pendingEmoji = '';
    let pendingSentence = '';

    openai.beta.threads.runs
      .stream(threadId, { assistant_id: assistantId })
      .on('textDelta', (textDelta) => {
        buffer += textDelta.value;
        fullAnswer += textDelta.value;

        const sentences = buffer.match(/[^.!?…]+[.!?…\s]*|.+$/g) || [];

        while (sentences.length > 1) {
          let sentence = sentences.shift().trim();
          if (!sentence) continue;

          // Проверяем, начинается ли предложение с эмодзи
          const emojiMatch = sentence.match(
            /^[\p{Emoji}\p{Emoji_Component}\p{Extended_Pictographic}]+/u,
          );

          if (emojiMatch) {
            pendingEmoji = emojiMatch[0]; // Сохраняем эмодзи
            sentence = sentence.slice(emojiMatch[0].length).trim();
          }

          // Если предложение не полное (нет знака препинания), ждем продолжения
          if (
            !/[!?…]$/.test(sentence) &&
            !/^[A-ZА-Я]/.test(sentence.slice(-1))
          ) {
            pendingSentence += (pendingSentence ? ' ' : '') + sentence;
            continue;
          }

          // Добавляем накопленную часть, если она есть
          if (pendingSentence) {
            sentence = pendingSentence + ' ' + sentence;
            pendingSentence = '';
          }

          if (pendingEmoji) {
            sentence += ' ' + pendingEmoji; // Добавляем эмодзи в конец
            pendingEmoji = '';
          }

          if (sentence !== lastSent) {
            sendMessageFunction(sentence.trim());
            lastSent = sentence;
          }
        }

        buffer = sentences[0] || ''; // Оставляем остаток в буфере
      })
      .on('end', () => {
        if (pendingSentence.trim().length > 0) {
          sendMessageFunction(pendingSentence.trim());
        }
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
