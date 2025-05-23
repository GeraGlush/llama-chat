import { getKeys, getFileData } from '../../helpers.js';
import { startTalkingToPerson } from './talkingToPerson.js';

export async function initTalking(client) {
  const peopesDataPaths = await getKeys('*.json');
  const people = await Promise.all(
    peopesDataPaths.map((key) => getFileData(key)),
  );
  people.forEach((person) => {
    if (!person.userId) return;
    startTalkingToPerson(client, person);
  });
}
