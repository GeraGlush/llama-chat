import { cache } from '../../helpers.js';

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
  } else {
    console.log(`Unknown command: ${command}`);
    // Handle unknown commands
  }
}
