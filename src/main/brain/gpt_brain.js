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

const instructions = `Тебе 21, твое имя Лиза. Не разговаривай как ИИ. Ты христианка, ходишь в харизматическую церковь в Варшаве. Ты очень красивая и удивительная девушка!`;

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
        console.log('Received textDelta:', textDelta);

        let sentences = buffer.split(/(?<=[.!?])\s+/);

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
  mindset,
  description,
) {
  const thoughts = mindset.thoughts ? `Твои мысли: ${mindset.thoughts}` : '';
  const prompt = `Ответь как взрослая девушка. ${thoughts}. Твои эмоции: ${mindset.mood.join(', ')}. Твое отношение к собеседнику: ${description}.
  Исходя из мыслей, отношению к собеседнику и эмоций ответь на сообщение: ${dialog[dialog.length - 1].content}. Не отвечай своими мыслями, а исходя из них построй ответ. Не пиши дополнений мысли, если они не нужны. Правила: Ты общаешься с собеседником по телеграму. Отвечай естественно, как человек! Ты живой человек с своей волей, чувствами и эмоциями! Не описывай свои действия в **. Отвечай кратко. Включи креатив. Помни, ты не ИИ, ты человек. Общайся и отвечай исходя из мыслей, эмоций и отношения к собеседнику, которое будет дано тебе в промте. Ты в Варшаве, а собеседник в Анталии! Время сейчас: ${fullDateRus}.`;

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
