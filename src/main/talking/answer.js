import { brain, AI } from '../index.js';
import { setFileData } from '../../helpers.js';
import { relationshipPlus } from '../brain/relationship.js';

let dialog = [];
const maxDialogLength = 2;

export async function answerToSinglePerson(client, person, message) {
  const lastMessage = await client.getMessages(person.username, {
    limit: 1,
  })[0];
  console.log('lastMessageMe:', lastMessageMe.message);

  if (lastMessage.out) return;
  if (dialog[0]?.text === message) return;
  console.log('resived:', message);

  dialog.unshift({
    speaker: 'user',
    name: person.name,
    text: message,
  });
  console.log(dialog);
  if (dialog.length > maxDialogLength) dialog.pop();
  console.log(dialog);
  console.log('dialog ??', dialog.length > maxDialogLength);

  // -- перед ответом

  const mindset = await brain.request(dialog);
  // await client.sendMessage(person.username, {
  //   message: `Мысли: ${mindset.thoughts}. \nОтношение после смс: ${mindset.relPlus}. \nЭмоции: ${mindset.mood}`,
  // });
  const answer = await AI.request(
    dialog,
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
  dialog = dialog.map((msg) => {
    msg.text.replace('Последнее смс (реагируй на него): ', '');
  });
  console.log('clean dialog', dialog);
  person.dialog = dialog;
  await setFileData(`peoples/${person.userId}.json`, person);
}

async function getMyLast(client, person) {
  const messages = await client.getMessages(person.username, { limit: 10 });
  const lastMyMessage = messages.find((msg) => msg.out);
  return lastMyMessage;
}
