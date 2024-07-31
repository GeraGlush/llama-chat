import { brain, AI } from '../index.js';
import { getFileData, setFileData } from '../../helpers.js';
import { relationshipPlus } from '../brain/relationship.js';

let dialog = [];

const maxDialogLength = 2;

export async function answerToSinglePerson(client, person, message) {
  const lastMessageNotFromMe = await getMyLast(client, person);

  if (message === lastMessageNotFromMe?.message) return;
  if (message.includes(lastMessageNotFromMe?.message)) return; // test with thoughts only!
  if (dialog[0]?.text === message) return;

  dialog.unshift({ speaker: 'user', name: person.name, text: message });
  if (dialog.length >= maxDialogLength) dialog.pop();
  // const promt = getPromt(person.name, message);

  const thoughts = await brain.request(dialog);
  // if (relationshipNewMessage) thoughts.thoughts += newRelationship;

  // const answer = await AI.request(message);
  await client.sendMessage(person.username, {
    message: `${dialog.map((msg) => `${msg.speaker}: ${msg.text}`).join('\n')}!`,
  });
  await client.sendMessage(person.username, {
    message: `Мысли: ${thoughts.thoughts}. \nОтношение после смс: ${thoughts.relPlus}. \nЭмоции: ${thoughts.mood}`,
  });
  dialog.unshift({ speaker: 'me', text: thoughts.thoughts });

  const newRelationship = await relationshipPlus(
    thoughts.relPlus,
    person.relationship,
  );
  person.relationship = newRelationship;
  await setFileData(`peoples/${person.id}.json`, person);
}

async function getMyLast(client, person) {
  const messages = await client.getMessages(person.username, { limit: 10 });
  const lastMyMessage = messages.find((msg) => msg.out);
  return lastMyMessage;
}
