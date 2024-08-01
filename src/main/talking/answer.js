import { brain, AI } from '../index.js';
import { setFileData } from '../../helpers.js';
import { relationshipPlus } from '../brain/relationship.js';

let dialog = [];
const maxDialogLength = 3;
const yoyHaveToPayMessage =
  'Сори... Я не могу тебе сказать ничего, напиши @geragl... Иначе я просто... В общем, напиши ему по поводу меня';

export async function answerToSinglePerson(client, person, message) {
  const lastMessage = await client.getMessages(person.username, {
    limit: 1,
  });
  if (lastMessage[0].out) return;
  console.log(message);

  dialog.unshift({
    speaker: 'user',
    name: person.name,
    text: message,
  });
  if (person.payStatus === 'trial' && person.relationship.step > 1) {
    person.payStatus = null;
    await client.sendMessage(person.username, {
      message: yoyHaveToPayMessage,
    });
    return;
  }
  if (dialog.length >= maxDialogLength) dialog.pop();
  if (dialog.length >= maxDialogLength) dialog.pop();

  // -- перед ответом

  const mindset = await brain.request([...dialog]);
  console.log(mindset);

  // await client.sendMessage(person.username, {
  //   message: `Мысли: ${mindset.thoughts}. \nОтношение после смс: ${mindset.relPlus}. \nЭмоции: ${mindset.mood}`,
  // });

  const answer = await AI.request(
    [...dialog],
    mindset,
    person.relationship.description,
  );
  dialog.unshift({
    speaker: 'me',
    text: answer,
    thoughts: mindset.thoughts,
  });
  await client.sendMessage(person.username, {
    message: answer,
  });

  // -- после ответа
  const newRelationship = await relationshipPlus(
    mindset.relPlus,
    person.relationship,
  );
  person.relationship = newRelationship ?? person.relationship;
  person.mood = mindset.mood;
  person.dialog = dialog;
  await setFileData(`peoples/${person.userId}.json`, person);
}
