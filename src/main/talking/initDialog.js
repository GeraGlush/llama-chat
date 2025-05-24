import { getActivity } from '../schedule/mySchedule.js';
import { generateMilenaReply } from './answer.js';

export async function InitDialog(client, person, intent) {
  console.log(
    `[milenaInitiatesDialog] Инициируем сообщение для ${person.username}`,
  );

  const diff = Date.now() - person.lastMessageDate;
  if (diff < 5 * 60 * 1000) {
    console.log(
      'C прошлого сообщения прошло меньше 5 минут, так что не инициируем новый диалог',
    );
    return false;
  }

  const activity = await getActivity(person.userId);
  person.activity = activity;

  let promptMessage =
    'Ты решила начать переписку. Напиши что-то живое и естественное — как будто реально открываешь чат, чтобы поболтать. Никаких общих фраз, только личный заход.';

  const dailyDiff = Date.now() - person.lastMessageDate;
  if (dailyDiff < 24 * 60 * 60 * 1000) {
    promptMessage += `\nТы уже переписывалась с ${person.name} сегодня, в последний раз ${Math.floor(
      dailyDiff / (1000 * 60 * 60),
    )} часов назад. Так что не здоровайся, ты уже это сделала.`;
  }

  await generateMilenaReply(
    client,
    person,
    `${promptMessage} Почему ты решила написать ${intent}`,
  );
  return true;
}
