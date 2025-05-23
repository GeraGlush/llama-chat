import { getFileData, setFileData } from '../../helpers.js';
import { generate } from '../brain/gpt_brain.js';
import { getActivity, waitForActivityDone } from '../schedule/mySchedule.js';
import {
  cancelTypingStatus,
  sendReaction,
  setTypingStatus,
  readMessages,
} from './clientHelper.js';

const pendingGenerations = new Map();

export async function generateMilenaReply(client, person, message) {
  let fullMessage = '';
  await readMessages(client, person.username);
  await setTypingStatus(client, person.username);

  const sendMessageFunction = async (sentence) => {
    fullMessage += sentence;
    console.log(sentence);
    sentence = sentence
      .replace(/\{MOMENT_MOOD\s*=\s*([^}]+)\}/, '')
      .replace('—', '-')
      .trim();

    const emojiOnly = sentence.match(
      /^[\p{Emoji}\p{Emoji_Component}\p{Extended_Pictographic}]{1,2}$/u,
    );

    console.log(emojiOnly);

    if (emojiOnly) {
      const emoji = emojiOnly[0];
      await sendReaction(client, person.username, emoji);
      return;
    }

    if (sentence.replace('.', '').length === 0) {
      console.log('Пустое сообщение, пропускаем отправку');
      return;
    }

    const msg = sentence.endsWith('.') ? sentence.slice(0, -1) : sentence;
    if (msg.length > 0) {
      await client.sendMessage(person.username, { message: msg });
    }

    // Отключаем статус typing
    await cancelTypingStatus(client, person.username);
  };

  const moodMomentPromt =
    'Если сообщение вызывает у тебя телесную или эмоциональную реакцию — в конце ответа на новой строке напиши {MOMENT_MOOD=...}.';
  let promt = moodMomentPromt;

  const lastState = person.lastState || {};
  const moodChanged = person.mood?.description !== lastState.moodDescription;
  const momentChanged = person.mood?.moment !== lastState.moment;
  const activityChanged =
    person.activity?.description !== lastState.activityDescription;

  const stateChanged = moodChanged || momentChanged || activityChanged;

  if (stateChanged)
    if (moodChanged && person.mood?.description)
      promt += person.mood.description;
  if (momentChanged && person.mood?.moment)
    promt += `Ты чувствуешь: ${person.mood.moment}`;
  if (activityChanged && person.activity?.description)
    promt += person.activity.description;

  promt = `[${promt}]`;

  person.lastState = {
    moodDescription: person.mood.description,
    moment: person.mood.moment,
    activityDescription: person.activity.description,
  };

  console.log(promt);

  await generate(`${promt}\n${person.name}: ${message}`, sendMessageFunction);

  const momentMoodMatch = fullMessage.match(/\{MOMENT_MOOD=(.*?)\}/);
  const momentMood = momentMoodMatch ? momentMoodMatch[1].trim() : null;

  if (momentMood) {
    console.log('MOMENT_MOOD =', momentMood);
    person.mood.moment = momentMood;

    // Если позитивные эмоции — ставим реакцию
    const isPositive =
      /рад|подмигив|восторг|счаст|класс|мил|удовольств|улыб|люб|тепло/i.test(
        momentMood,
      );
    if (isPositive) {
      const messages = (
        await client.getMessages(person.username, { limit: 10 })
      ).reverse();
      let lastUserMessageId = null;

      // Перебираем сообщения, чтобы найти последнее сообщение от пользователя
      for (let i = 0; i < messages.length; i++) {
        // Проверяем, что сообщение от пользователя и не от нас
        if (!messages[i].out) {
          lastUserMessageId = messages[i].id; // Сохраняем ID последнего сообщения от пользователя
        }
      }

      if (lastUserMessageId) {
        await sendReaction(client, person.username, lastUserMessageId, '❤️');
      }
    }
  }

  person.lastMessageDate = Date.now();
  await setFileData(`peoples/${person.userId}.json`, person);
}

export async function answerToSinglePerson(client, person, message, filePath) {
  const lastMessage = await client.getMessages(person.username, { limit: 1 });
  if (lastMessage[0]?.out) {
    return;
  }

  if (pendingGenerations.has(person.userId)) {
    console.log(
      `[answerToSinglePerson] Добавлено в очередь для ${person.username}`,
    );
    const pending = pendingGenerations.get(person.userId);
    pending.messages.push(message);

    // Перезапускаем таймер
    clearTimeout(pending.timer);
    pending.timer = setTimeout(async () => {
      await flushPendingMessages(client, person);
    }, 3000);

    return;
  }

  console.log(
    `[answerToSinglePerson] Начинаем новую очередь для ${person.username}`,
  );

  const timer = setTimeout(async () => {
    await flushPendingMessages(client, person);
  }, 3000);

  pendingGenerations.set(person.userId, {
    messages: [message],
    timer,
  });
}

async function flushPendingMessages(client, person) {
  const pending = pendingGenerations.get(person.userId);
  if (!pending) return;

  pendingGenerations.delete(person.userId);

  const combinedMessage = pending.messages.join('. ');

  const activity = await getActivity(person.userId);
  person.activity = activity;

  if (activity.hurry > 0) {
    await waitForActivityDone(activity.hurry);
  }

  await generateMilenaReply(client, person, combinedMessage);
}
