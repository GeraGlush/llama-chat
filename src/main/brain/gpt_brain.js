import OpenAI from 'openai';
import { getPromt } from './promt/promtCreator.js';
import { getFileData, setFileData } from '../../helpers.js';

const openai = new OpenAI({
  apiKey:
    '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',
});

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
    model: 'gpt-4o',
    instructions: getPromt(),
    temperature: 1.1,
    top_p: 1.0,
  });

  console.log('Создан новый ассистент:', assistant.id);
  return assistant.id;
}

async function createThread() {
  const thread = await openai.beta.threads.create();
  return thread.id;
}

// Добавляем сообщение, но сначала проверяем активные `run`
// Проверка, пустой ли поток
async function isThreadEmpty(threadId) {
  const messages = await openai.beta.threads.messages.list(threadId);
  return messages.data.length === 0;
}

async function addMessageToThread(role, content) {
  if (!content) return;

  await ensureRunFinished(threadId);

  try {
    const isEmpty = await isThreadEmpty(threadId);

    // if (isEmpty) {
    //   console.log('📌 Добавляю assistant prompt');
    //   await openai.beta.threads.messages.create(threadId, {
    //     role: 'assistant',
    //     content: getPromt(),
    //   });
    // }

    await openai.beta.threads.messages.create(threadId, { role, content });
  } catch (error) {
    console.error('❌ Ошибка при добавлении сообщения:', error.message);

    // Поток сбрасываем и пробуем снова
    threadId = await createThread();
    await setFileData('src/main/brain/settings.json', {
      assistantId,
      threadId,
    });

    // Повторяем с новым потоком
    await addMessageToThread(role, content);
  }
}

export async function generate(prompt, sendMessageFunction) {
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
      .stream(threadId, {
        assistant_id: assistantId,
      })
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
          sendMessageFunction(
            buffer.replace(/\(Уровень интересности:\s*\d+\)/g, '').trim(),
          );
        }
        resolve(fullAnswer.trim());
      })
      .on('error', (err) => {
        console.error('Ошибка в стриме OpenAI:', err);
        reject(err);
      });
  });
}
