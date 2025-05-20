import { setFileData } from '../../helpers.js';
import { generate } from '../brain/gpt_brain.js';
import { getActivity, waitForActivityDone } from '../schedule/mySchedule.js';
import { Api } from 'telegram/tl/index.js';
const pendingGenerations = new Map();

export async function answerToSinglePerson(client, person, message) {
  const lastMessage = await client.getMessages(person.username, { limit: 1 });

  if (lastMessage[0]?.out) {
    await setFileData(
      `peoples/${person.userId}.json`,
      removeCircularReferences(person),
    );
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

  const sendMessageFunction = async (sentence) => {
    const emoji = sentence.match(
      /^[\p{Emoji}\p{Emoji_Component}\p{Extended_Pictographic}]+/u,
    );
    if (emoji) {
      await client.sendMessage(person.username, { message: emoji[0] });
      sentence = sentence.slice(emoji[0].length).trim();
    }

    const message = sentence.endsWith('.') ? sentence.slice(0, -1) : sentence;
    if (message.length > 0)
      await client.sendMessage(person.username, { message });
  };

  console.log('Генерация ответа...');

  const messagesToAnswerOn = pendingGenerations
    .get(person.userId)
    .messages.join('. ');
  const fullAnswer = await generate(messagesToAnswerOn, sendMessageFunction);

  pushMessage(person, fullAnswer);
  pendingGenerations.delete(person.userId);

  try {
    await setFileData(
      `peoples/${person.userId}.json`,
      removeCircularReferences(person),
    );
    console.log('Все сохранено');
  } catch (error) {
    console.log('Ошибка сохранения данных');
  }
}

function removeCircularReferences(obj) {
  const seen = new WeakSet();
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return undefined; // Удаляем циклическую ссылку
        seen.add(value);
      }
      return value;
    }),
  );
}

const pushMessage = (person, content, role = 'assistant', name = 'Милена') => {
  const maxDialogLength = 15;
  person.dialog.push({ role, name, content });
  if (person.dialog.length > maxDialogLength) person.dialog.shift();
};

async function setReaction(client, mood, message, userId) {
  const messageId = message.id;
  const emotions = {
    playfulness: '❤️',
    pleased: '❤️',
    friendly: '❤️',
    love: '❤️',
    happy: '❤️',
    tenderness: '❤️',
    devotion: '❤️',
  };

  const reaction = [];
  mood.forEach(({ emotion, score }) => {
    if (emotions[emotion] && score > 0.3) {
      reaction.push(new Api.ReactionEmoji({ emoticon: '❤️' }));
    }
  });

  if (reaction.length === 0) return;
  const inputPeer = await client.getInputEntity(userId);
  await client.invoke(
    new Api.messages.SendReaction({
      peer: inputPeer,
      msgId: messageId,
      reaction: [new Api.ReactionEmoji({ emoticon: '❤️' })],
      addToRecent: true,
    }),
  );
}
