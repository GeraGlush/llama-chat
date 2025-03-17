import { StringSession } from 'telegram/sessions/index.js';
import { Api, TelegramClient } from 'telegram';
import readline from 'readline';
import path from 'path';
import fs from 'fs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function connect() {
  console.log('Connecting...');
  const __dirname = path.resolve();
  const pathToAccountData = path.join(
    __dirname,
    'src/main/telegram/accout.json',
  );
  const accoutData = JSON.parse(fs.readFileSync(pathToAccountData));

  const session = accoutData.save
    ? new StringSession(accoutData.save)
    : new StringSession('');

  const client = new TelegramClient(
    session,
    29888951,
    'c2315bdaa91a43b557f38363853ecca3',
    {
      connectionRetries: 5,
    },
  );

  await client.start({
    phoneNumber: '+7(929)-202-69-49',
    phoneCode: async () =>
      new Promise((resolve) =>
        rl.question('Please enter the code you received: ', resolve),
      ),
    onError: (err) => console.log(err),
  });
  console.log('You should now be connected.');

  fs.writeFileSync(pathToAccountData, JSON.stringify({ save: session.save() }));
  return client;
}

export async function sendMessage(client, username, message) {
  await client.sendMessage(username, { message });
}
