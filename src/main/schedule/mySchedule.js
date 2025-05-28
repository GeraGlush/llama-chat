import { generateRandomSchedule } from './generator.js';
import { generateRandomMood } from '../brain/mood/mood.js';
import { InitDialog } from '../talking/initDialog.js';
import { get, set } from '../../helpers.js';
import { init as initBrain } from '../brain/gpt_brain.js';

function formatScheduleDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

async function ensureSchedule(userId) {
  const today = formatScheduleDate();
  let scheduleData = await get('schedule');

  if (scheduleData?.date === today) {
    return scheduleData.activities;
  }

  const newSchedule = await generateRandomSchedule();
  await initBrain();
  await set('schedule', { date: today, activities: newSchedule });
  return newSchedule;
}

async function getCurrentActivity(activities) {
  const warsawTime = new Date().toLocaleTimeString('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
  });
  const currentHour = warsawTime.split(':')[0];
  const currentMinute = warsawTime.split(':')[1];
  const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

  const currentActivity = activities.find((entry) => {
    const [startTime, endTime] = entry.duration.split('-').map((t) => t.trim());
    if (endTime > startTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      return currentTime >= startTime || currentTime < endTime;
    }
  }) || { activity: 'Ничем не занята', hurry: [0] };

  return currentActivity;
}

export async function getActivity(userId) {
  const activities = await ensureSchedule(userId);
  const activity = await getCurrentActivity(activities);
  if (!activity.hurry) activity.hurry = [0]; // если нет hurry, то считаем, что 0

  const description = getActivityDescription(activity);
  return { ...activity, description };
}

let waitTime = 0;

export async function waitForActivityDone(hurry) {
  const waitTimeForActivity = {
    // in minutes
    0: [0.0167, 0.0167],  // 1 сек, чтобы подрузить другие смс
    1: [0, 0.5],
    2: [3, 7],
    3: [8, 20],
  };
  let activity = await getActivity();  
  if (!hurry || !activity?.name) return;

  if (hurry === 4) {
    while (activity.hurry == 4) {
      activity = await getActivity();
      console.log(`Не могу ответить, занята: ${activity.name}...`);
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
    return;
  }

  if (waitTime <= 0) {
    const [minTime, maxTime] = waitTimeForActivity[hurry];
    waitTime = Math.random() * (maxTime - minTime) + minTime;

    console.log(
      `Я пока занята! ${activity.name} До ответа: ${waitTime.toFixed(1)} мин`,
    );

    while (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      waitTime -= 0.1;
    }
    waitTime = 0;
    return;
  }
}

function getActivityDescription(activity) {
  const hurryDescription = {
    0: 'Ты не занята',
    1: 'Немного занята.',
    2: 'Сильно занята',
    3: 'Очень занята, надо бежать',
    4: 'Не могу ответить',
  };
  const hurry = hurryDescription[activity.hurry];
  return `Сейчас ты ${activity.name || 'ничем особо не занята'}. Уровень твоей занятости: ${hurry}`;
}

export async function watchFunctions(client, person) {
  let lastActivityKey = null;

  while (true) {
    const activities = (await ensureSchedule(person.userId)).filter(
      (activity) => activity.function,
    );
    const activity = await getCurrentActivity(activities);

    const currentKey = `${activity.name}-${activity.duration}`;

    if (activity.function === 'initDialog' && currentKey !== lastActivityKey) {
      lastActivityKey = currentKey;
      const updatedPerson = await get(`peoples/${person.userId}.json`); // важно! За время ожидания мог измениться
      const isDialogInited = await InitDialog(
        client,
        updatedPerson,
        activity.reason,
      );
      if (!isDialogInited) {
        const schedule = await ensureSchedule(person.userId);
        schedule.forEach((act) => {
          if (
            act.name === activity.name &&
            act.duration === activity.duration
          ) {
            const addHour = (timeStr) => {
              const [hours, minutes] = timeStr.split(':').map(Number);
              const date = new Date();
              date.setHours(hours + 1);
              date.setMinutes(minutes);
              const hh = String(date.getHours()).padStart(2, '0');
              const mm = String(date.getMinutes()).padStart(2, '0');
              return `${hh}:${mm}`;
            };

            const [start, end] = act.duration.split('-');
            const newStart = addHour(start);
            const newEnd = addHour(end);

            act.duration = `${newStart}-${newEnd}`;
          }
        });

        await set('schedule', {
          date: formatScheduleDate(),
          activities: schedule,
        });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
}
