import { setFileData } from '../../helpers.js';
import { generate } from '../brain/gpt_brain.js';
import { relationshipPlus } from '../brain/relationship.js';
import { getActivity, waitForActivityDone } from '../schedule/mySchedule.js';
import {
  getUpdatedMood,
  getMood,
  getMoodDescription,
} from '../brain/mood/mood.js';
import { Api } from 'telegram/tl/index.js';
import { countRewar, getNewMood } from '../brain/mood/determinant.js';

const pendingGenerations = new Map();
const interests = new Map();

export async function answerToSinglePerson(client, person, message) {
  // #region Проверка на необходимость ответа
  if (!shouldAnswer(person.userId, message)) return;

  const lastMessage = await client.getMessages(person.username, { limit: 1 });

  if (lastMessage[0]?.out) {
    await setFileData(`peoples/${person.userId}.json`, person);
    return;
  }

  // Проверяем, есть ли активная генерация
  pushMessage(person, message, 'user', person.username);

  if (pendingGenerations.has(person.userId)) {
    console.log(
      `[answerToSinglePerson] Сообщение добавлено к ожиданию для ${person.username}`,
    );
    pendingGenerations.get(person.userId).messages.push(message);
    return;
  }

  // Создаем запись о запущенной генерации
  pendingGenerations.set(person.userId, {
    messages: [message],
    isGenerating: true,
  });
  // #endregion

  // #region Получение данных

  console.log('Получение данных для ответа...');

  const activity = await getActivity(person.userId);
  person.activityDescription = activity.activityDescription;

  await waitForActivityDone(activity.hurry);

  const newMoodData = await getNewMood(message);
  const relPlus = countRewar(newMoodData); // по полученным эмоциям
  const updatedMood = await getUpdatedMood(person.mood, newMoodData);
  person.mood = updatedMood;
  const moodDescription = await getMoodDescription(updatedMood);

  // Обновляем уровень отношений
  relationshipPlus(relPlus, person.relationship).then((res) => {
    person.relationship = res ?? person.relationship;
  });

  // Устанавливаем реакцию на сообщение
  setReaction(client, newMoodData, lastMessage[0], person.userId);
  // #endregion

  // Функция отправки сообщения
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

  // Генерируем полный ответ
  console.log('Генерация ответа...');

  const fullAnswer = await generate(
    sendMessageFunction,
    person.dialog,
    person.relationship.description,
    person.activityDescription,
    moodDescription,
  );

  // Добавляем ответ в диалог
  pushMessage(person, fullAnswer);
  pendingGenerations.delete(person.userId);

  // Сохраняем данные
  await setFileData(`peoples/${person.userId}.json`, person);
  console.log('Все сохранено');
}

const pushMessage = (person, content, role = 'assistant', name = 'Милена') => {
  const maxDialogLength = 15;
  person.dialog.push({ role, name, content });
  if (person.dialog.length > maxDialogLength) person.dialog.shift();
};

const shouldAnswer = (userId, message) => {
  let interest = interests.get(userId) || 10;
  interest++;

  if (message.includes('...')) interest += 3;
  if (message.includes('?')) {
    interest += 5;
    return true;
  }

  if (message.includes('!')) interest += 5;
  if (!message.includes(' ')) interest -= 4;

  if (interest > 10) interest = 10;
  if (interest < 0) interest = 0;
  if (interest < 3) return false;
  interests.set(userId, interest);
  return true;
};

async function setReaction(client, mood, message, userId) {
  const messageId = message.id;
  const emotions = {
    playfulness: '❤️',
    pleased: '❤️',
    friendly: '❤️',
    love: '❤️',
    tenderness: '❤️',
    devotion: '❤️',
  };

  const reaction = [];
  const currentMood = await getMood(userId);
  mood.forEach((emotion) => {
    if (
      emotions[emotion] &&
      currentMood[emotion] &&
      currentMood[emotion] > 0.5
    ) {
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
