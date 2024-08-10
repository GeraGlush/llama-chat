import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey:
    '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',
});
const instructions = `Тебе 21, твое имя Лиза. Ты также обладаешь сильным характером, который не оставит равнодушным. Ты очень красивая и удивительная девушка!
Правила: Ты общаешься с собеседником по телеграму. Отвечай есстественно, как человек! Ты живой человек с своей волей, чувствами и эмоциями! Не описывай свои действия в **. Отвечай кратко. Включи креатив. Помни, ты не ИИ, ты человек. Общайся и отвечай исходя из мыслей, эмоций и отношению к собеседнику, которое будет дано тебе в промте. Ты в Варшаве, а собеседник в Анталии! Вы не можете контактировать!`;

let assistantId;
let threadId;

export async function init() {
  assistantId = await createAssistant();
  threadId = await createThread();
  process.on('SIGINT', async () => {
    console.log('SIGINT received. Closing active threads...');
    await openai.beta.threads.del(threadId);
    process.exit();
  });
}

async function createAssistant() {
  const assistant = await openai.beta.assistants.create({
    name: 'Liza',
    instructions,
    // model: 'gpt-4o',
    // model: 'gpt-3.5-turbo-16k',
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
      .on('textDelta', async (textDelta) => {
        buffer += textDelta.value;

        // Разделение текста на предложения
        let sentences = buffer.split(/(?<=[.!?])\s+/);

        if (sentences.length > 1) {
          for (let i = 0; i < sentences.length - 1; i++) {
            const sentenceTrimed = sentences[i].trim();

            // Проверка: отправлять сообщение только если оно еще не было отправлено
            if (sentenceTrimed && !sentMessages.has(sentenceTrimed)) {
              await sendMessageFunction(sentenceTrimed);
              fullAnswer += sentenceTrimed + ' ';
              sentMessages.add(sentenceTrimed);
            }
          }

          // Обновление буфера, чтобы в нем осталась только последняя неполная часть предложения
          buffer = sentences[sentences.length - 1];
        }
      })
      .on('end', () => {
        resolve(fullAnswer.trim());
      })
      .on('error', (err) => {
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
  Исходя из мыслей, отношению к собеседнику и эмоций ответь на сообщение: ${dialog[dialog.length - 1].content}. Не отвечай своими мыслями, а исходя из них построй ответ. Не пиши дополнений мысли, если они не нужны`;
  await addMessageToThread(threadId, dialog[dialog.length - 1].role, prompt);
  for (let i = 1; i < dialog.length; i++) {
    await addMessageToThread(threadId, dialog[i].role, dialog[i].content);
  }

  // Ждем немного, чтобы все сообщения были обработаны
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Затем получаем ответ ассистента
  const fullAnswer = await streamAssistantResponse(
    sendMessageFunction,
    threadId,
    assistantId,
  );

  return fullAnswer;
}
