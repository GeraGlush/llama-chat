import { setFileData } from '../../helpers.js';
import { generate } from '../brain/gpt_brain.js';
import { getActivity, waitForActivityDone } from '../schedule/mySchedule.js';
import { getMood, getMoodDescription } from '../brain/mood/mood.js';

const pendingGenerations = new Map();

async function generateMilenaReply(client, person, message, state) {
  const sendMessageFunction = async (sentence) => {
    const emoji = sentence.match(
      /^[\p{Emoji}\p{Emoji_Component}\p{Extended_Pictographic}]+/u,
    );
    if (emoji) {
      await client.sendMessage(person.username, { message: emoji[0] });
      sentence = sentence.slice(emoji[0].length).trim();
    }

    const msg = sentence.endsWith('.') ? sentence.slice(0, -1) : sentence;
    if (msg.length > 0) {
      await client.sendMessage(person.username, { message: msg });
    }
  };

  const contextPrefix = [];
  const lastState = person.lastState || {};

  if (
    state.moodDescription &&
    state.moodDescription !== lastState.moodDescription
  ) {
    contextPrefix.push(`Твое настроение: ${state.moodDescription}.`);
  }

  if (
    state.activity &&
    state.activity !== 'написать смс' &&
    state.activity !== lastState.activity
  ) {
    contextPrefix.push(`Чем ты сейчас занимаешься: ${state.activity}.`);
  }

  if (state.promt && state.promt !== lastState.promt)
    contextPrefix.push(state.promt);

  const fullPrompt =
    `${contextPrefix.length > 0 ? `[${contextPrefix.join(' ')}]` : ''} ${message ?? ''}`.trim();
  console.log(`[${contextPrefix.join(' ')}]`);

  const answer = await generate(fullPrompt, sendMessageFunction);
  pushMessage(person, answer);

  person.lastState = {
    ...person.lastState,
    moodDescription: state.moodDescription ?? person.lastState?.mood,
    activity: state.activity ?? person.lastState?.activity,
  };

  await setFileData(`peoples/${person.userId}.json`, person);
}

export async function InitDialog(client, person, message, intent) {
  console.log(
    `[milenaInitiatesDialog] Инициируем сообщение для ${person.username}`,
  );
  pushMessage(person, message, 'user', person.username);

  const lastState = person.lastState || {};

  const activity = intent || (await getActivity(person.userId)).name;

  const state = {};

  const mood = await getMood(person.userId);
  if (mood && mood !== lastState?.mood) {
    state.moodDescription = mood.description;
  }

  if (activity && activity !== lastState.activity) {
    state.activity = activity;
  }

  state.promt =
    'Ты решила начать переписку. Напиши что-то живое и естественное — как будто реально открываешь чат, чтобы поболтать. Никаких общих фраз, только личный заход.';

  await generateMilenaReply(client, person, message, state);
}

export async function answerToSinglePerson(client, person, message) {
  const lastMessage = await client.getMessages(person.username, { limit: 1 });

  if (lastMessage[0]?.out) {
    await setFileData(`peoples/${person.userId}.json`, person);
    return;
  }

  pushMessage(person, message, 'user', person.username);

  if (pendingGenerations.has(person.userId)) {
    console.log(
      `[answerToSinglePerson] Сообщение добавлено к ожиданию для ${person.username}`,
    );
    pendingGenerations.get(person.userId).messages.push(message);
    return;
  }

  pendingGenerations.set(person.userId, {
    messages: [message],
    isGenerating: true,
  });

  console.log('Получение данных для ответа...');
  const activity = await getActivity(person.userId);
  person.activity = activity;

  if (activity.hurry > 0) {
    await waitForActivityDone(activity.hurry);
  }

  const lastState = person.lastState || {};
  const state = {};
  if (activity.name && activity.name !== lastState.activity) {
    state.activity = activity.name;
  }
  if (person.mood.emotions && person.mood.emotions !== lastState.emotions) {
    state.moodDescription = await getMoodDescription(person.mood.emotions);
  }

  const messagesToAnswerOn = pendingGenerations
    .get(person.userId)
    .messages.join('. ');

  console.log('Генерация ответа...');
  await generateMilenaReply(client, person, messagesToAnswerOn, state);

  pendingGenerations.delete(person.userId);
}

const pushMessage = (person, content, role = 'assistant', name = 'Милена') => {
  const maxDialogLength = 15;
  person.dialog.push({ role, name, content });
  if (person.dialog.length > maxDialogLength) person.dialog.shift();
};
