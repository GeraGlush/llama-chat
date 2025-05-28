import { StringSession } from 'telegram/sessions/index.js';
import { Api, TelegramClient } from 'telegram';
import readline from 'readline';
import { get, set } from '../../helpers.js';

import dotenv from 'dotenv';
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function connect() {
  console.log('Connecting...');
  const accoutData = (await get('telegram_account_data')) || {};

  const session = accoutData
    ? new StringSession(accoutData)
    : new StringSession('');

  const client = new TelegramClient(
    session,
    Number(process.env.TELEGRAM_API_ID),
    process.env.TELEGRAM_API_HASH,
    {
      connectionRetries: 5,
    }
  );

  await client.start({
    phoneNumber: process.env.TELEGRAM_PHONE_NUMBER,
    password: process.env.TELEGRAM_PASSWORD,
    phoneCode: async () =>
      new Promise((resolve) =>
        rl.question('Please enter the code you received: ', resolve)
      ),
    onError: (err) => console.log(err),
  });
  console.log('You should now be connected.');

  await set('telegram_account_data', client.session.save());
  return client;
}

export async function sendMessage(client, username, message) {
  if (!username || !message || message.trim() === '') {
    console.error('Username and message are required to send a message.');
    return;
  }

  await client.sendMessage(username, { message });
}
