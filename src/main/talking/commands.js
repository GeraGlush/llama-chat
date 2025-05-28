import { cache } from '../../helpers.js';
import fs from 'fs';
import { init } from '../brain/gpt_brain.js';

export async function handleCommand(client, person, command) {
  console.log(`Handling command: ${command} for ${person.username}`);

  // Here you can implement the logic to handle different commands
  // For example:
  if (command === '/del') {
    if (await cache.get(`settings`)) {
      await cache.del(`settings`);
    }
    await client.sendMessage(person.username, { message: '+' });
    // You can send a welcome message or perform any other action
  } else if (command === '/killServer') {
    if (await cache.get(`server_status`)) {
      await cache.del(`server_status`);
    }
    await client.sendMessage(person.username, { message: '+' });
  } else if (command === '/getDialog') {
    const dialog = fs.readFileSync('dialog.txt', 'utf8');
    const message = `Вот часть диалога ИИ, которое должно общаться как человек (Нортик) и человека. Найти места, где нортик говорит не как реальный человек ${dialog}`;
    await client.sendMessage(person.username, { message });
  } else if (command.includes('/getPromt')) {
    const promt = await cache.get('promt');
    const message = `Поправь промт, учти, что этот промт уже довольно хороший и не стоит его радикально переделывать. Так же добавь в промт вещи, которые Нортик должна выполнять дальше, чтобы соответсвовать тому, что говорила в диалоге. Вот промт, который был у Нортика при диалоге:\n${promt}`;
    await client.sendMessage(person.username, { message });
  } else if (command.includes('/setPromt')) {
    await cache.set('promt', command.replace('/setPromt', '').trim());
  } else if (command.includes('/reloadGpt')) {
    await cache.del('settings');
    await init();
    await client.sendMessage(person.username, {
      message: 'Reloaded',
    });
  } else {
    console.log(`Unknown command: ${command}`);
    // Handle unknown commands
  }
}
