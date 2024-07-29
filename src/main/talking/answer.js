import { brain, AI } from '../index.js';
import { getPromt } from '../request_templates/promtCreator.js';

export async function answerToSinglePerson(client, person, message) {
  // const promt = getPromt(person.name, message);
  // const thoughts = await brain.request(message);
  const answer = await AI.request(message);
  await client.sendMessage(person.username, { message: answer });
}
