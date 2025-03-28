import { scanDir, getFileData } from '../../helpers.js';
import { startTalkingToPerson } from './talkingToPerson.js';

export async function initTalking(client) {
  const peopesDataPaths = await scanDir('peoples');
  const people = peopesDataPaths.map((path) => getFileData(path));

  people.forEach(async (person) => {
    const dialog = await client.getMessages(person.username, { limit: 10 });
    person.dialog = dialog.map((message) => ({
      role: message.out ? 'user' : 'assistant',
      name: message.out ? 'Я' : person.name,
      content: message.text,
    }));
    startTalkingToPerson(client, person);
  });
}
