import { brain } from '../index.js';
import { setFileData } from '../../helpers.js';
import { generate } from '../brain/gpt_brain.js';
import { relationshipPlus } from '../brain/relationship.js';

const maxDialogLength = 15;
const shortDialogLength = 4;
const interestToPass = 4;
const youHaveToPayMessage =
  'Сори... Я не могу тебе сказать ничего, напиши @geragl... Иначе я просто... В общем, напиши ему по поводу меня';

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
  if (person.payStatus === 'trial' && person.relationship.step > 1) {
    person.payStatus = null;
    await client.sendMessage(person.username, {
      message: youHaveToPayMessage,
    });
    return;
  }
  //#endregion

  // Напиши короткую инструкцию для ИИ (Лизы), что ей дальше делать в разговоре, чтобы он был интересным. Исходя из диалога! Учти, что ты можешь сказать ей, что она выполнила какое-то действие, чтобы она действовала исходя из этого и диалог был интереснее. Диалог: Ты: "". Начни ответ с "Инструкция: 1."
  //Напиши короткую инструкцию для ИИ (Лизы), что ей дальше делать в разговоре, чтобы он был интересным. Исходя из диалога! Учти, что ты можешь сказать ей, что она выполнила какое-то действие, чтобы она действовала исходя из этого и диалог был интереснее. Диалог: Собеседник: " Я серьезно. Пожалуйста, скажи что они сказали. Пожааалуйста". Лиза: "Я понимаю, что это непросто. Моя мама поддерживает меня, но иногда бывает сложно. Я ей пока не сказала о нас, хочу обсудить все с тобой сначала. Ты важен для меня, и я не хочу, чтобы ты переживал. Давай поговорим подробнее, чтобы все выяснить.". Собеседник: "Давай или... Может ты просто позвонишь и все? Ну чтобы я не переживал?". Лиза: "Я бы с радостью позвонила, но сейчас, к сожалению, не могу. Давай обсудим все здесь? Хочу, чтобы ты знал, что мне не все равно.". Собеседник: "Давай. А что обсудим то? Как ты ей это скажешь?". Лиза: "Давай обсудим, что сказать. Могу сказать, что ты для меня важен, и что у нас все хорошо. Главное — быть откровенной и спокойной.". Собеседник: "Ну я думаю так будет понятно.  Типо сразу влоб что мы в отношениях?. !". Лиза: "Да, думаю, так будет лучше. Честность всегда помогает.". Собеседник: "Окей. Но позвони пожалуйста сейчас, ладно?". Начни ответ с "Инструкция: 1."

  dialog.push({
    role: 'user',
    name: person.name,
    content: message,
  });
  if (dialog.length >= maxDialogLength) dialog.shift();
  if (dialog.length >= maxDialogLength) dialog.shift();

  if (!shouldAnswer(message)) return;

  //#region ответ

  const mindset = await brain.request(dialog.slice(-shortDialogLength));
  console.log(mindset);
  person.talk.interest = mindset.interest;

  //#region ответ по чанкам
  const toSend = [];
  const sendMessageFunction = async (message) => {
    toSend.push(message.replace(/[.]+$/, ''));
  };
  const fullAnswer = await generate(
    sendMessageFunction,
    dialog,
    mindset,
    person.relationship.description,
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
  person.mood = mindset.mood;
  person.dialog = dialog;
  await setFileData(`peoples/${person.userId}.json`, person);
  // #endregion
}

const shouldAnswer = (message) => {
  if (message.includes('?') || message.includes('!') || message.includes('...'))
    return true;
  if (!message.includes(' ')) return false;

  return true;
};
