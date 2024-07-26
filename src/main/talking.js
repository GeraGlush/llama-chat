import { scanDir } from '../helpers.js';

export async function initTalking(client) {
  const peopesDataPaths = await scanDir('peoples');
  console.log(peopesDataPaths);
}

async function newMessageResived(messageData) {
  const userId = update.message.peerId.userId;
  const text = update.message.message;
  console.log(`Получено сообщение от пользователя с ID ${userId}: ${text}`);
  console.log(messageData);
}
