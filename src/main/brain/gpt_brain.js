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
const instructions = `Тебе 22, твое имя Лиза. Ты христианка, ходишь в харизматическую церковь. Ты очень красивая и удивительная девушка! Ты живешь в Варшаве, в квартире, которую снимаешь с подругой Катей.`;

let assistantId;
let threadId;

export async function init() {
  const data = await getFileData('src/main/brain/settings.json');
  assistantId = data.assistantId;
  threadId = data.threadId;
  if (threadId) {
    await openai.beta.threads.del(threadId).catch((error) => {
      console.error(`Error deleting thread: ${error.message}`);
    });
  }
  threadId = await createThread();
  data.threadId = threadId;

  if (!assistantId) {
    assistantId = await createAssistant();
    data.assistantId = assistantId;
  }
  await setFileData('src/main/brain/settings.json', data);
}

async function createAssistant() {
  const assistant = await openai.beta.assistants.create({
    name: 'Liza',
    instructions,
    model: 'gpt-4o-mini',
  });
  return assistant.id;
}

async function createThread() {
  const thread = await openai.beta.threads.create();
  return thread.id;
}

async function addMessageToThread(threadId, role, content) {
  if (content === '') return;
  await openai.beta.threads.messages.create(threadId, {
    role: role,
    content: content,
  });
}

async function streamAssistantResponse(
  sendMessageFunction,
  threadId,
  assistantId,
) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    let fullAnswer = '';
    const sentMessages = new Set();

    const run = openai.beta.threads.runs
      .stream(threadId, {
        assistant_id: assistantId,
      })
      .on('textDelta', (textDelta) => {
        buffer += textDelta.value;
        let sentences = splitBuffer(buffer);

        if (sentences.length > 1) {
          for (let i = 0; i < sentences.length - 1; i++) {
            const sentenceTrimed = sentences[i].trim();

            if (sentenceTrimed && !sentMessages.has(sentenceTrimed)) {
              sendMessageFunction(sentenceTrimed)
                .then(() => {
                  fullAnswer += sentenceTrimed + ' ';
                  sentMessages.add(sentenceTrimed);
                })
                .catch((error) => {
                  console.error(`Error sending message: ${error.message}`);
                });
            }
          }

          buffer = sentences[sentences.length - 1];
        }
      })
      .on('end', () => {
        resolve(fullAnswer.trim());
      })
      .on('error', (err) => {
        console.error(`Stream error: ${err.message}`);
        reject(err);
      });
  });
}

export async function generate(
  sendMessageFunction,
  dialog,
  description,
  activityDescription,
  emotionsDescription,
) {
  const currentDayOfweek = new Date().getDay();
  const warsawTime = new Date().toLocaleTimeString('ru-RU', {
    timeZone: 'Europe/Warsaw',
    hour: '2-digit',
    minute: '2-digit',
  });

  const fullDateRus =
    new Date().toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) +
    ', ' +
    warsawTime +
    ', ' +
    daysOfWeek[currentDayOfweek];

  const prompt = `
  Ответь как взрослая девушка, находящаяся в Варшаве. Твои эмоции: ${emotionsDescription}. ${activityDescription}.
  Ответь на сообщение собеседника: "${dialog[dialog.length - 1].content}". Ваши отношения с собеседником: ${description}. Время у тебя сейчас: ${fullDateRus}.
  Правила: Не отвечай шаблонно. Постарайся включить эмоции и креатив, но держись естественно. Избегай типичных фраз вроде "Конечно!" и прочих, которые бы выдавали тебя как ИИ. Ответ должен быть кратким и похожим на то, что мог бы сказать настоящий человек, помни, ты — не ИИ, а человек.`;
  await addMessageToThread(threadId, dialog[dialog.length - 1].role, prompt);

  for (let i = 1; i < dialog.length; i++) {
    await addMessageToThread(threadId, dialog[i].role, dialog[i].content);
  }

  // Ждем немного, чтобы все сообщения были обработаны
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Затем получаем ответ ассистента
  const fullAnswer = await streamAssistantResponse(
    sendMessageFunction,
    threadId,
    assistantId,
  );

  return fullAnswer;
}

function splitBuffer(buffer) {
  const parts = buffer.split(/(?<=\.{3}|[.!?])\s*/);

  let result = [];
  let currentSentence = '';

  parts.forEach((part) => {
    const emojiMatch = part.match(
      /^[\p{Emoji}\p{Emoji_Component}\p{Extended_Pictographic}]+/u,
    );

    if (emojiMatch && result.length > 0) {
      result[result.length - 1] += ' ' + emojiMatch[0];
      part = part.slice(emojiMatch[0].length);
    }

    if (part === '.' && result.length > 0) {
      result[result.length - 1] += part;
    } else if (part.trim() !== '') {
      if (/[.!?…]$/.test(part)) {
        currentSentence += part;
        result.push(currentSentence.trim());
        currentSentence = '';
      } else {
        currentSentence += part;
      }
    }
  });

  return result;
}
