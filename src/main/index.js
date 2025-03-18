import { connect } from './telegram/telegram.js';
import { initTalking } from './talking/talkingController.js';
import { init as initBrain } from './brain/gpt_brain.js';

export let brain;

async function start() {
  const client = await connect();
  await initBrain();

  await initTalking(client);
  console.log('Connecting done');
}

start();
