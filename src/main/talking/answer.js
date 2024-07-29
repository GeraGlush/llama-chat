import { getPromt } from '../request_templates/promtCreator.js';
import { generateAnswer } from '../AI.js';

export async function answerToSinglePerson(client, person, message) {
  const promt = getPromt(person.name, message);
  const answer = await generateAnswer(promt, message);
  await client.sendMessage(person.username, { message: answer });
}
