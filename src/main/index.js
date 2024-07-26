import { connect } from './telegram/telegram.js';
import { initTalking } from './talking.js';

async function start() {
  // const client = await connect();
  initTalking('client');
  console.log('Connecting done');
}

start();
