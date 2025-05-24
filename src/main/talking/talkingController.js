import { getKeys, get } from '../../helpers.js';
import { startTalkingToPerson } from './talkingToPerson.js';

export async function initTalking(client) {
  const peopesDataPaths = await getKeys('*.json');
  const people = await Promise.all(peopesDataPaths.map((key) => get(key)));
  people.forEach((person) => {
    if (!person.userId) return;
    startTalkingToPerson(client, person);
  });
}
