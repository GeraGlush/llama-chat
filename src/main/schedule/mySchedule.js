import fs from 'fs-extra';
import path from 'path';
import { generateRandomSchedule } from './generator.js';
import { generateRandomMood } from '../brain/mood/mood.js';
import { InitDialog } from '../talking/initDialog.js';
import { getFileData, setFileData } from '../../helpers.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const scheduleFile = path.join(__dirname, 'schedule.json');

function formatScheduleDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

async function ensureSchedule(userId) {
  const today = formatScheduleDate();
  let scheduleExists = await fs.pathExists(scheduleFile);

  if (scheduleExists) {
    let scheduleData = await fs.readJson(scheduleFile).catch((err) => {
      return;
    });
    if (scheduleData?.date === today) {
      return scheduleData.activities;
    }
  }
  const newSchedule = await generateRandomSchedule();
  const newMood = await generateRandomMood();
  const person = await getFileData(`peoples/${userId}.json`);
  person.mood = newMood;
  await setFileData(`peoples/${userId}.json`, person);

  await fs.writeJson(scheduleFile, { date: today, activities: newSchedule });
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

  const description = getActivityDescription(activity);
  return { ...activity, description };
}

let waitTime = 0;

export async function waitForActivityDone(hurry) {
  const waitTimeForActivity = {
    // in minutes
    1: [0, 0.5],
    2: [3, 7],
    3: [8, 20],
  };
  let activity = await getActivity();

  if (hurry === 4) {
    while (activity.hurry == 4) {
      activity = await getActivity();
      console.log(`Не могу ответить, занята: ${activity.name}...`);
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
    return;
  }

  if (hurry === 0 || !waitTimeForActivity[hurry]) {
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
      const updatedPerson = await getFileData(`peoples/${person.userId}.json`); // важно! За время ожидания мог измениться
      await InitDialog(client, updatedPerson, activity.reason);
    }

    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
}
