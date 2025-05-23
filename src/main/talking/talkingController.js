import { getKeys, getFileData } from '../../helpers.js';
import { startTalkingToPerson } from './talkingToPerson.js';

export async function initTalking(client) {
  const peopesDataPaths = await getKeys('person_*');
  const people = peopesDataPaths.map(async (key) => await getFileData(key));

  people.forEach(async (person) => {
    startTalkingToPerson(client, person);
  });
}
