import { StringSession } from 'telegram/sessions/index.js';
import { TelegramClient } from 'telegram';
import { newMessageResived } from '../talking.js';
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

  const session = new StringSession(accoutData.save);

  const client = new TelegramClient(
    session,
    '23781410',
    'c051a14b63203ec645edbee1586b5843',
    {
      connectionRetries: 5,
    },
  );

  await client.start({
    phoneNumber: '+905350594616',
    password: async () => '13-201`o+O@!)#(amh*js1',
    phoneCode: async () =>
      new Promise((resolve) =>
        rl.question('Please enter the code you received: ', resolve),
      ),
    onError: (err) => console.log(err),
  });
  console.log('You should now be connected.');

  fs.writeFileSync(pathToAccountData, JSON.stringify({ save: session.save() }));

  client.addEventHandler(async (update) => {
    if (
      'message' in update &&
      update.message.peerId &&
      update.message.peerId.userId
    ) {
      await newMessageResived(update.message);
    }
  }, new Api.UpdateNewMessage());

  return client;
}

export async function sendMessage(client, chatId, message) {
  await client.sendMessage(chatId, { message });
}
