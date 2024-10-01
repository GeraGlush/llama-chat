import { connect } from './telegram/telegram.js';
import { initTalking } from './talking/talkingController.js';
import { init as initBrain } from './brain/gpt_brain.js';
import { NN } from './brain/NN_requests.js';
import { generateRandomMood } from './brain/mood/mood.js';

export let brain;

async function start() {
  const client = await connect();
  brain = new NN();
  await initBrain();
  await generateRandomMood(1057932677);

  await initTalking(client);
  console.log('Connecting done');
}

start();
