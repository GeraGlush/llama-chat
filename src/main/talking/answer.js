import { brain } from '../index.js';
import { setFileData } from '../../helpers.js';
import { generate } from '../brain/gpt_brain.js';
import { relationshipPlus } from '../brain/relationship.js';
import { getActivity } from '../schedule/mySchedule.js';
import { setMood, getMoodsDescription } from '../brain/mood/mood.js';

const maxDialogLength = 15;
const shortDialogLength = 4;
const interestToPass = 4;

export async function answerToSinglePerson(client, person, message) {
  const dialog = person.dialog;
  const lastMessage = await client.getMessages(person.username, {
    limit: 1,
  });
  person.talk.interest++;

  //#region фильтр сообщений
  if (lastMessage[0].out) return;
  if (person.talk.interest < interestToPass) {
    await setFileData(`peoples/${person.userId}.json`, person);
    return;
  }
  //#endregion

  // Напиши короткую инструкцию для ИИ (Лизы), что ей дальше делать в разговоре, чтобы он был интересным. Исходя из диалога! Учти, что ты можешь сказать ей, что она выполнила какое-то действие, чтобы она действовала исходя из этого и диалог был интереснее. Диалог: Ты: "". Начни ответ с "Инструкция: 1."

  dialog.push({
    role: 'user',
    name: person.name,
    content: message,
  });
  if (dialog.length >= maxDialogLength) dialog.shift();
  if (dialog.length >= maxDialogLength) dialog.shift();

  if (!shouldAnswer(message)) return;

  //#region ответ

  const activityDescription = await getActivity();
  if (activityDescription.includes('Не могу ответить')) return;
  const mindset = await brain.request(dialog.slice(-shortDialogLength));
  const moodDescription = await getMoodsDescription(person.userId);
  person.talk.interest = mindset.interest;

  //#region ответ по чанкам
  const toSend = [];
  const sendMessageFunction = async (message) => {
    // const emojiRegex =
    //   /[\p{Emoji}\p{Emoji_Component}\p{Extended_Pictographic}]/gu;
    toSend.push(message.replace(/[.]+$/, ''));
  };
  const fullAnswer = await generate(
    sendMessageFunction,
    dialog,
    mindset,
    person.relationship.description,
    activityDescription,
    moodDescription,
  );
  if (fullAnswer === '' && toSend.length === 0) return;

  for (let i = 0; i < toSend.length; i++) {
    if (toSend[i] === toSend[i + 1]) continue;
    await client.sendMessage(person.username, {
      message: toSend[i],
    });
  }
  // #endregion

  dialog.push({
    role: 'assistant',
    content: fullAnswer,
    thoughts: mindset.thoughts,
  });

  //#endregion

  // #region сохранение данных
  const newRelationship = await relationshipPlus(
    mindset.relPlus,
    person.relationship,
  );
  person.relationship = newRelationship ?? person.relationship;
  await setMood(mindset.mood, person.userId);
  person.dialog = dialog;
  person.activityDescription = activityDescription;
  await setFileData(`peoples/${person.userId}.json`, person);
  // #endregion
}

const shouldAnswer = (message) => {
  if (message.includes('?') || message.includes('!') || message.includes('...'))
    return true;
  if (!message.includes(' ')) return false;

  return true;
};
