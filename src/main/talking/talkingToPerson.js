import { setFileData } from '../../helpers.js';
import { NewMessage } from 'telegram/events/index.js';
import { answerToSinglePerson } from './answer.js';
import { Api } from 'telegram';
import { watchActivity } from '../schedule/mySchedule.js';

let talking = false;

async function setup(client, person) {
  talking = true;
  client.addEventHandler((update) => {
    handleNewMessage(update, client, person);
  }, new NewMessage({}));

  watchActivity(client, person);
  console.log(`Listening for new messages from ${person.username}...`);
}

async function handleNewMessage(update, client, person) {
  const userId = Number(update.message.peerId.userId.value);

  if (userId === person.userId) {
    console.log('New message from', person.username);

    const messageDate = new Date(update.message.date * 1000);
    if (messageDate > person.lastResponseTime) {
      // Проверка, является ли сообщение голосовым
      if (update.message.media && update.message.media.document) {
        const isVoiceMessage =
          update.message.media.document.mimeType.startsWith('audio/ogg');

        if (isVoiceMessage) {
          // Пересылаем голосовое сообщение боту @AudioMessBot
          const forwardedMessage = await client.invoke(
            new Api.messages.ForwardMessages({
              fromPeer: update.message.peerId,
              id: [update.message.id],
              toPeer: 'AudioMessBot',
            }),
          );

          // Ожидание ответа от @AudioMessBot
          const botPeer = await client.getEntity('AudioMessBot');
          let recognizedText = '';

          try {
            // Устанавливаем цикл ожидания ответа с таймаутом
            for (let i = 0; i < 10; i++) {
              // Пытаемся 10 раз, с интервалом в 2 секунды
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
          } catch (error) {
            console.error('Error while waiting for bot response:', error);
          }

          if (recognizedText) {
            await answerToSinglePerson(client, person, recognizedText);
          }
        }
      } else {
        const text = update.message.message;
        await answerToSinglePerson(client, person, text);
      }

      person.lastResponseTime = new Date().getTime();
      await setFileData(`peoples/${userId}.json`, person);
    }
  }
}

export async function startTalkingToPerson(client, person) {
  if (!client) return console.error('No client provided to', person.username);

  fetchLatestMessages(client, person);
  if (!talking) await setup(client, person);
}

async function fetchLatestMessages(client, person) {
  const messages = await client.getMessages(person.username, {
    limit: 20,
  });

  const lastResponseTime = person.lastResponseTime
    ? new Date(person.lastResponseTime)
    : new Date(new Date().getTime() - 12 * 60 * 60 * 1000);

  const filtredMessages = messages.filter((msg) => {
    const messageDate = new Date(msg.date * 1000);
    return messageDate > lastResponseTime;
  });

  let newMessages = [];

  for (let i = 0; i < filtredMessages.length - 1; i++) {
    if (filtredMessages[i].out) break;
  }
  newMessages = newMessages.reverse();

  if (newMessages.length > 0) {
    console.log('New unreaded from', person.username);
    const combinedText = newMessages.map((msg) => msg.text).join('. ');
    await answerToSinglePerson(client, person, combinedText);
    person.lastResponseTime = new Date().getTime();
    const userId = messages[0].peerId.userId.value;
    setFileData(`peoples/${Number(userId)}.json`, person);
  }
}
