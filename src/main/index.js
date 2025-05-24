import { connect } from './telegram/telegram.js';
import { initTalking } from './talking/talkingController.js';
import { init as initBrain } from './brain/gpt_brain.js';
import { cache } from '../helpers.js';
import dotenv from 'dotenv';
dotenv.config();

export let brain;

async function start() {
  if (process.env.MODE !== 'dev' && (await cache.get('server_status'))) {
    await new Promise((resolve) => setTimeout(resolve, 5500));
    if (await cache.get('server_status'))
      throw new Error('Server is already running');
  }

  const client = await connect();
  await initBrain();

  await initTalking(client);
  console.log('Connecting done');

  while (process.env.MODE !== 'dev') {
    await cache.set('server_status', 'isRunning', {
      EX: 5,
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

start();
