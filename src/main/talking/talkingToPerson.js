import { setFileData } from '../../helpers.js';
import { NewMessage } from 'telegram/events/index.js';
import { answerToSinglePerson } from './answer.js';

let talking = false;

async function setup(client, person) {
  talking = true;
  client.addEventHandler((update) => {
    handleNewMessage(update, client, person);
  }, new NewMessage({}));

  console.log(`Listening for new messages from ${person.username}...`);
}

async function handleNewMessage(update, client, person) {
  const userId = Number(update.message.peerId.userId.value);

  if (userId === person.userId) {
    const messageDate = new Date(update.message.date * 1000);
    if (messageDate > person.lastResponseTime) {
      const text = update.message.message;
      await answerToSinglePerson(client, person, text);
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

  const newMessages = messages.filter(
    (msg) => new Date(msg.date * 1000) > lastResponseTime,
  );

  if (newMessages.length > 0) {
    const combinedText = newMessages.map((msg) => msg.text).join('. ');
    await answerToSinglePerson(client, person, combinedText);
    person.lastResponseTime = new Date().getTime();
    const userId = messages[0].peerId.userId.value;
    setFileData(`peoples/${Number(userId)}.json`, person);
  }
}
