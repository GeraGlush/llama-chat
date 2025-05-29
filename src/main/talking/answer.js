import { set, cache } from '../../helpers.js';
import { generate } from '../brain/gpt_brain.js';
import { getActivity, waitForActivityDone } from '../schedule/mySchedule.js';
import {
  cancelTypingStatus,
  sendReaction,
  setTypingStatus,
  readMessages,
} from './clientHelper.js';
import { InitDialog } from './initDialog.js';

export async function generateMilenaReply(client, person, message) {
  let fullMessage = '';
  await readMessages(client, person.username);
  await setTypingStatus(client, person.username);

  const sendMessageFunction = async (sentence) => {
    fullMessage += sentence;

    sentence = sentence
      .replace(/\{MOMENT_MOOD\s*=\s*([^}]+)\}/, '')
      .replace('—', '-')
      .trim();

    const emojiOnly = sentence
      .trim()
      .replace(/[.! ]/, '')
      .match(/^[\p{Emoji}\p{Emoji_Component}\p{Extended_Pictographic}]{1,2}$/u);
    if (emojiOnly) {
      const emoji = emojiOnly[0];
      await sendReaction(client, person.username, emoji);
      return;
    }

    const emojiWithText = sentence.match(/^(\p{Emoji})[.! ]+(.+)/u);
    if (emojiWithText) {
      sentence = emojiWithText[2].trim();
    }

    if (sentence.replace('.', '').length === 0) {
      console.log('Пустое сообщение, пропускаем отправку');
      return;
    }

    const msg = sentence.endsWith('.') ? sentence.slice(0, -1) : sentence;
    if (msg.length > 0) {
      await client.sendMessage(person.username, { message: msg });
    }

    await cancelTypingStatus(client, person.username);
  };
  const lastState = person.lastState || {};

  const newActivity = await getActivity(person.userId);

  let promt = '';

  console.log(newActivity.name, person.activity.name);
  

  if (
    (newActivity.name !== person.activity.name)
  ) {
    promt = `[Ты была занята: ${person.activity.name}, и только что освободилась]\n${message}`;
    console.log(promt);
  } else {
    promt = message;
  }

  person.lastState = {
    moodDescription: person.mood.description,
    moment: person.mood.moment,
    activityDescription: person.activity.description,
  };

  await generate(promt, sendMessageFunction, person.userId);

  person.lastMessageDate = Date.now();
  await set(`peoples/${person.userId}.json`, person);
}

const pendingMessages = new Map();

export async function answerToSinglePerson(client, person, _incomingMessage) {
  if (pendingMessages.has(person.userId)) {
    console.log(
      `[answerToSinglePerson] Пропускаем ответ для ${person.username}, так как уже есть в очереди`,
    );
    pendingMessages.set(
      person.userId,
      pendingMessages.get(person.userId) + '\n' + _incomingMessage,
    );
    return;
  } else {
    pendingMessages.set(person.userId, _incomingMessage);
    console.log(
      '[answerToSinglePerson] Создаем очередь ответ для',
      person.username,
    );
  }

  const activity = await getActivity(person.userId);
  person.activity = activity;

  if (activity.hurry > 0) {
    console.log(
      `[answerToSinglePerson] Ждём активность (${activity.description}) для ${person.username}`,
    );
  }
  await waitForActivityDone(activity.hurry);


  const messages = pendingMessages.get(person.userId);
  pendingMessages.delete(person.userId);
  await generateMilenaReply(client, person, messages);

  person.lastMessageDate = Date.now();
  await randomContinueDialog(client, person);
  await set(`peoples/${person.userId}.json`, person);
}


async function randomContinueDialog(client, person) {
  const random = Math.floor(Math.random() * 10);
  
  if (random < 8) return;
  const randomDelay = Math.floor(
    Math.random() * (120 - 5 + 1) + 5,
  );

  await new Promise((resolve) =>
    setTimeout(resolve, randomDelay * 1000),
  );

  if (pendingMessages.has(person.userId)) {
    console.log('[randomContinueDialog] Уже общаемся с', person.username, 'не начинаем новый диалог');
    return;
  }

await waitForActivityDone(person.activity.hurry);
const reasons = [
  'продолжить разговор', // не ошибка. Нужно, чтобы была вероятность больше, что будет продолжение разговора
  'продолжить разговор',
  'продолжить разговор',
  'продолжить разговор',
  'продолжить разговор',
  'продолжить разговор',
  'поговорить о чем-то',
  'сказать, что я к нему чувствую сейчас',
  'рассказать что у меня нового',
  'спросить, как у него дела',
  'задать вопрос',
  'поделиться своими мыслями',
  'поговорить о чем-то интересном',
  'обсудить что-то важное',
];
  const reason = reasons[Math.floor(Math.random() * reasons.length)];
  await InitDialog(client, person, reason, -1);
}