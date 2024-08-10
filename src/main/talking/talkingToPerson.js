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
    console.log('New message from', person.username);

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

  const filtredMessages = messages.filter((msg) => {
    const messageDate = new Date(msg.date * 1000);
    return messageDate > lastResponseTime;
  });

  let newMessages = [];

  for (let i = 0; i < filtredMessages.length - 1; i++) {
    if (filtredMessages[i].out) break;
    newMessages.push(filtredMessages[i]);
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
