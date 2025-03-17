import { brain } from '../index.js';
import { setFileData } from '../../helpers.js';
import { generate } from '../brain/gpt_brain.js';
import { relationshipPlus } from '../brain/relationship.js';
import { getActivity, waitForActivityDone } from '../schedule/mySchedule.js';
import { setMood, getMood, getMoodsDescription } from '../brain/mood/mood.js';
import { Api } from 'telegram/tl/index.js';

const maxDialogLength = 15;
const shortDialogLength = 3;
const interestToPass = 4;

const pendingGenerations = new Map(); // Хранит ожидающие генерации

export async function answerToSinglePerson(client, person, message) {
  if (!shouldAnswer(message)) return;

  person.talk.interest = Math.min(person.talk.interest + 1, 10);
  const lastMessage = await client.getMessages(person.username, { limit: 1 });

  if (lastMessage[0]?.out || person.talk.interest < interestToPass) {
    await setFileData(`peoples/${person.userId}.json`, person);
    return;
  }

  // Проверяем, есть ли активная генерация
  if (pendingGenerations.has(person.userId)) {
    console.log(
      `[answerToSinglePerson] Новая функция прекращена: сообщение добавлено к ожиданию для ${person.username}`,
    );
    pendingGenerations.get(person.userId).messages.push(message);
    return;
  }

  // Создаем запись о запущенной генерации
  pendingGenerations.set(person.userId, {
    messages: [message],
    isGenerating: true,
  });

  person.dialog.push({ role: 'user', name: person.name, content: message });
  if (person.dialog.length > maxDialogLength) person.dialog.shift();

  console.log('activityDescription');
  const activity = await getActivity(person.userId);
  console.log(activity);

  const activityDescription = activity.activityDescription;
  person.activityDescription = activityDescription;

  await waitForActivityDone(activity.hurry); // Ждем в соответствии с занятостью

  let mindset = person.lastMindset;
  let moodDescription = person.lastMoodDescription;

  if (!/Ты не занята|Немного занята/.test(activityDescription)) {
    console.log('Используем прошлые данные');

    const moodPromise = brain
      .request(person.dialog.slice(-shortDialogLength))
      .then((res) => {
        person.lastMindset = res;
        return res?.mood || null;
      })
      .catch(console.error);

    Promise.all([
      getMoodsDescription(person.userId).then((res) => {
        person.lastMoodDescription = res;
      }),
      relationshipPlus(person.talk.interest, person.relationship).then(
        (res) => {
          person.relationship = res ?? person.relationship;
        },
      ),
    ]).catch(console.error);

    moodPromise
      .then((newMood) => {
        if (newMood) {
          setReaction(client, newMood, lastMessage[0], person.userId);
        }
      })
      .catch(console.error);
  } else {
    console.log('Обновляем данные перед ответом');
    [mindset, moodDescription] = await Promise.all([
      brain.request(person.dialog.slice(-shortDialogLength)),
      getMoodsDescription(person.userId),
    ]);

    relationshipPlus(person.talk.interest, person.relationship)
      .then((res) => {
        person.relationship = res ?? person.relationship;
      })
      .catch(console.error);

    person.lastMindset = mindset;
    person.lastMoodDescription = moodDescription;

    setReaction(client, mindset.mood, lastMessage[0], person.userId);
  }

  const sendMessageFunction = async (sentence) => {
    const message = sentence.endsWith('.') ? sentence.slice(0, -1) : sentence;
    await client.sendMessage(person.username, { message });
  };

  // Ждем и объединяем все накопленные сообщения
  await new Promise((resolve) => setTimeout(resolve, 200));

  const combinedMessage = pendingGenerations
    .get(person.userId)
    .messages.join(' ');
  pendingGenerations.delete(person.userId); // Убираем из ожидания

  // Добавляем объединенное сообщение в диалог
  person.dialog.push({
    role: 'user',
    name: person.name,
    content: combinedMessage,
  });
  if (person.dialog.length > maxDialogLength) person.dialog.shift();

  console.log(`[generate] Запускаем генерацию ответа для ${person.username}`);

  const fullAnswerPromise = generate(
    sendMessageFunction,
    person.dialog,
    person.relationship.description,
    activityDescription,
    moodDescription,
  );

  const fullAnswer = await fullAnswerPromise;
  person.dialog.push({ role: 'assistant', content: fullAnswer });

  // Очистка статуса генерации
  pendingGenerations.delete(person.userId);

  // Асинхронно сохраняем настроение и данные без ожидания
  Promise.all([
    mindset?.mood ? setMood(mindset.mood, person.userId) : Promise.resolve(),
    setFileData(`peoples/${person.userId}.json`, person),
  ]).catch(console.error);
}

const shouldAnswer = (message) => {
  if (message.includes('?') || message.includes('!') || message.includes('...'))
    return true;
  if (!message.includes(' ')) return false;

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
