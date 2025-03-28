import { setFileData } from '../../helpers.js';
import { generate } from '../brain/gpt_brain.js';
import { relationshipPlus } from '../brain/relationship/relationship.js';
import { getActivity, waitForActivityDone } from '../schedule/mySchedule.js';
import { getUpdatedMood, getMoodDescription } from '../brain/mood/mood.js';
import { Api } from 'telegram/tl/index.js';
import { getNewMood } from '../brain/mood/determinant.js';
import { rateConversation } from '../brain/conversation/conversationRater.js';
import { getPromt } from '../brain/promt/promtCreator.js';

const pendingGenerations = new Map();
const interests = new Map();

export async function answerToSinglePerson(client, person, message) {
  if (!shouldAnswer(person.userId, message)) return;

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

  if (activity.hurry > 0) await waitForActivityDone(activity.hurry);

  const [newEmotions, conversationRate] = await Promise.all([
    getNewMood(message),
    rateConversation(person),
  ]);

  if (conversationRate.interestScore < 0.4) {
    console.log('Диалог не интересный. Можно не отвечать');
    pendingGenerations.delete(person.userId);
    return;
  }

  const updatedMood = getUpdatedMood(person.mood.emotions, newEmotions);
  const moodDescription = await getMoodDescription(updatedMood);

  // const cleanedEmotions = updatedMood.emotions || updatedMood;
  // if (cleanedEmotions.emotions) cleanedEmotions = cleanedEmotions.emotions;
  person.mood = {
    emotions: updatedMood,
    description: moodDescription.description || moodDescription,
  };
  person.conversation = conversationRate;

  setReaction(client, newEmotions, lastMessage[0], person.userId);

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
  const prompt = getPromt(
    messagesToAnswerOn,
    person.mood.description,
    person.relationship.description,
    person.conversation.description,
    person.activity.description,
  );
  const fullAnswer = await generate(prompt, sendMessageFunction);

  pushMessage(person, fullAnswer);
  pendingGenerations.delete(person.userId);

  const relationship = await relationshipPlus(newEmotions, person.relationship);
  person.relationship = relationship;

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
