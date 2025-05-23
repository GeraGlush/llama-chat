import { setFileData } from '../../helpers.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function createNewUser() {
  const user = {
    name: 'Неизвестно',
    username: 'username',
    userId: 0,
    lastResponseTime: null,
    payStatus: 'trial',
    mood: ['frendly'],
    relationship: {
      points: 5,
      step: 1,
    },
    dialog: [],
  };

  const { name, username } = await new Promise((resolve) => {
    rl.question('Enter name: ', (name) => {
      rl.question('Enter username: ', (username) => {
        resolve({ name, username });
      });
    });
  });

  const userId = await new Promise((resolve) => {
    rl.question('Enter userId: ', (userId) => {
      resolve(userId);
    });
  });

  user.name = name;
  user.username = username;
  user.userId = userId;
  await setFileData(`peoples/${userId}.json`, user);
}

await createNewUser();
