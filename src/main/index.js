import { connect } from './telegram/telegram.js';
import { initTalking } from './talking/talkingController.js';
import { NN } from './brain/NN_requests.js';

export let brain, AI;

async function start() {
  const client = await connect();
  brain = new NN('brain');
  AI = new NN('AI');

  await initTalking(client);
  console.log('Connecting done');
}

start();
