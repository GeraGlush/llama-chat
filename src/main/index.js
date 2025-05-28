import { connect } from './telegram/connect.js';
import { initTalking } from './talking/talkingController.js';
import { init as initBrain } from './brain/gpt_brain.js';
import { get, set } from '../helpers.js';
import dotenv from 'dotenv';
dotenv.config();

export let brain;

async function start() {
  if (process.env.MODE !== 'dev' && (await get('server_status'))) {
    await new Promise((resolve) => setTimeout(resolve, 5500));
    if (await get('server_status'))
      throw new Error('Server is already running');
  }

  const client = await connect();
  await initBrain();

  await initTalking(client);
  console.log('Connecting done');

  while (process.env.MODE !== 'dev') {
    await set('server_status', 'isRunning', {
      EX: 30,
    });
    await new Promise((resolve) => setTimeout(resolve, 20000));
    if (!(await get('server_status'))) {
        console.error(
          'Failed to set server status after 3 attempts, exiting...',
        );
        process.exit(1);
    }
  }
}

start();
