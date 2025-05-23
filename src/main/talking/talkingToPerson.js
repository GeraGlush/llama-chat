import { setFileData } from '../../helpers.js';
import { NewMessage } from 'telegram/events/index.js';
import { answerToSinglePerson } from './answer.js';
import { Api } from 'telegram';
import { watchFunctions } from '../schedule/mySchedule.js';
import fs from 'fs';
import path from 'path';

let talking = false;

async function setup(client, person) {
  talking = true;
  client.addEventHandler((update) => {
    handleNewMessage(update, client, person);
  }, new NewMessage({}));

  watchFunctions(client, person);
  console.log(`Listening for new messages from ${person.username}...`);
}

async function recognizeVoiceMessage(client, update) {
  try {
    await client.invoke(
      new Api.messages.ForwardMessages({
        fromPeer: update.message.peerId,
        id: [update.message.id],
        toPeer: 'AudioMessBot',
      }),
    );

    const botPeer = await client.getEntity('AudioMessBot');
    let recognizedText = '';

    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const history = await client.invoke(
        new Api.messages.GetHistory({
          peer: botPeer,
          limit: 1,
        }),
      );

      const lastMessage = history.messages[0];
      if (
        lastMessage &&
        lastMessage.message &&
        !lastMessage.message.includes(' Распознаю голос')
      ) {
        recognizedText = lastMessage.message.replace('🗣 ', '');
        break;
      }
    }

    return recognizedText;
  } catch (error) {
    console.error('Voice recognition error:', error);
    return null;
  }
}

async function handleNewMessage(update, client, person) {
  const userId = Number(update.message.peerId.userId.value);
  if (userId !== person.userId) return;

  console.log('New message from', person.username);

  const messageDate = new Date(update.message.date * 1000);
  if (
    !person.lastMessageDate ||
    messageDate.getTime() > person.lastMessageDate
  ) {
    if (update.message.media && update.message.media.document) {
      const mime = update.message.media.document.mimeType;
      const isVoiceMessage =
        mime.startsWith('audio/ogg') || mime === 'video/mp4';

      if (isVoiceMessage) {
        const text = await recognizeVoiceMessage(client, update);
        if (text) await answerToSinglePerson(client, person, text);
        return;
      } else {
        try {
          const filePath = path.resolve('files', `${person.userId}`);
          if (!fs.existsSync(filePath))
            fs.mkdirSync(filePath, { recursive: true });

          const file = await client.downloadMedia(update.message.media, {
            outputFile: path.join(filePath, `${Date.now()}.bin`),
          });

          console.log('Downloaded file to', file);
          await answerToSinglePerson(client, person, `Получен файл: ${file}`);
        } catch (e) {
          console.error('Ошибка загрузки файла:', e);
        }
        return;
      }
    }

    const text = update.message.message;
    await answerToSinglePerson(client, person, text);
  }
}

export async function startTalkingToPerson(client, person) {
  if (!client) return console.error('No client provided to', person.username);

  await fetchLatestMessages(client, person);
  if (!talking) await setup(client, person);
}

async function fetchLatestMessages(client, person) {
  const messages = await client.getMessages(person.username, { limit: 20 });
  const lastMessageDate = person.lastMessageDate
    ? new Date(person.lastMessageDate)
    : new Date(Date.now() - 12 * 60 * 60 * 1000);

  const filteredMessages = messages.filter((msg) => {
    const messageDate = new Date(msg.date * 1000).getTime();
    return messageDate > lastMessageDate.getTime();
  });

  const newMessages = [];
  for (const msg of filteredMessages) {
    if (msg.out) break;
    if (msg.text) {
      newMessages.push({ text: msg.text, date: new Date(msg.date * 1000) });
    }
  }

  newMessages.reverse();

  if (newMessages.length > 0) {
    console.log('New unreaded from', person.username);
    const combinedText = newMessages.map((msg) => msg.text).join('. ');
    const userId = messages[0].peerId.userId.value;
    await answerToSinglePerson(client, person, combinedText);
    await setFileData(`peoples/${Number(userId)}.json`, person);
  }
}
