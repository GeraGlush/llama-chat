import { scanDir, getFileData } from '../../helpers.js';
import { startTalkingToPerson } from './talkingToPerson.js';

export async function initTalking(client) {
  const peopesDataPaths = await scanDir('peoples');
  const people = peopesDataPaths.map((path) => getFileData(path));

  people.forEach(async (person) => {
    startTalkingToPerson(client, person);
  });
}
