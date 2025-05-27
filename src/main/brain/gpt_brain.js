import OpenAI from 'openai';
import { getPromt } from './promt/promtCreator.js';
import { get, set } from '../../helpers.js';
import dotenv from 'dotenv';

import fs from 'fs';
import path from 'path';

dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let assistantId;
let threadId;

const activeRuns = new Map();

export async function init() {
  const data = (await get('settings')) || {};
  assistantId = data?.assistantId;
  threadId = data?.threadId;

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

  await set('settings', data);

  fs.appendFileSync('dialog.txt', await getThreadMessages(), 'utf8');
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
      await set('settings', {
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
    temperature: 0.7,
    top_p: 0.9,
  });

  console.log('Создан новый ассистент:', assistant.id);
  return assistant.id;
}

async function createThread() {
  const thread = await openai.beta.threads.create();
  return thread.id;
}


async function addMessageToThread(role, content, userId = null) {
  if (!content) return;

  await ensureRunFinished(threadId);

  try {
    const userDir = userId ? path.join('files', 'users', String(userId)) : null;
    const attachments = [];    

    if (userDir && fs.existsSync(userDir) && userId) {
      const files = fs.readdirSync(userDir);
      const supportedImageExts = ['.jpg', '.jpeg', '.png', '.webp'];
      const supportedFileExts = ['.pdf'];
      const supportedUploadExts = [...supportedImageExts, ...supportedFileExts];

      for (const fileName of files) {
        const filePath = path.join(userDir, fileName);
        const ext = path.extname(fileName).toLowerCase();

        if (!supportedUploadExts.includes(ext)) {
          console.log(`⏭ Пропущен неподдерживаемый файл: ${fileName}`);
          continue;
        }

        const file = await openai.files.create({
          file: fs.createReadStream(filePath),
          purpose: 'assistants',
        });

        if (supportedImageExts.includes(ext)) {
          attachments.push({
            type: 'image_file',
            image_file: { file_id: file.id },
          });
        } else if (supportedFileExts.includes(ext)) {
          attachments.push({
            type: 'file',
            file: { file_id: file.id },
          });
        }

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('✅ Загружен и удалён файл:', fileName);
        }
      }

    }

    if (content) {
      attachments.push({ type: 'text', text: content });
    }

    if (attachments.length > 0) {
      await openai.beta.threads.messages.create(threadId, {
        role,
        content: attachments,
      });
    }

  } catch (error) {
    console.error('❌ Ошибка при добавлении сообщения:', error.message);

    // Пересоздать поток и попробовать снова
    threadId = await createThread();
    await set('settings', {
      assistantId,
      threadId,
    });

    await addMessageToThread(role, content, userId);
  }
}

export async function generate(prompt, sendMessageFunction, userId) {
  while (activeRuns.has(threadId)) {
    console.log(
      `⏳ Ожидание завершения предыдущего процесса в треде ${threadId}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await addMessageToThread('user', prompt, userId);
  const answer = await getFullResponse(
    sendMessageFunction,
    threadId,
    assistantId,
  );
  activeRuns.delete(threadId);
  return answer;
}

async function getFullResponse(sendMessageFunction, threadId, assistantId) {
  activeRuns.set(threadId, true);
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

export async function getThreadMessages() {
  try {
    const messages = await openai.beta.threads.messages.list(threadId);

    const sorted = messages.data.sort(
      (a, b) => new Date(a.created_at * 1000) - new Date(b.created_at * 1000),
    );

    const formatted = sorted
      .map((msg) => {
        const role = msg.role === 'assistant' ? 'я' : 'он';
        const text = msg.content[0]?.text?.value?.trim() || '';
        return `${role}: ${text}`;
      })
      .join('\n');

    return formatted;
  } catch (error) {
    console.error('Ошибка при получении сообщений из треда:', error);
  }
}
