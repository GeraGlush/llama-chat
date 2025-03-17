import fs from 'fs-extra';
import path from 'path';
import { generateRandomSchedule } from './generator.js';
import { generateRandomMood } from '../brain/mood/mood.js';

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
    let scheduleData = await fs.readJson(scheduleFile);
    if (scheduleData.date === today) {
      return scheduleData.activities;
    }
  }
  const newSchedule = await generateRandomSchedule();
  await generateRandomMood(userId);
  await fs.writeJson(scheduleFile, { date: today, activities: newSchedule });
  return newSchedule;
}
async function getCurrentActivity(activities) {
  const warsawTime = new Date().toLocaleTimeString('ru-RU', {
    timeZone: 'Europe/Warsaw',
    hour: '2-digit',
    minute: '2-digit',
  });
  const currentHour = warsawTime.split(':')[0];
  const currentMinute = warsawTime.split(':')[1];
  const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

  const currentActivity = activities.find((entry) => {
    const [startTime, endTime] = entry.time.split('-').map((t) => t.trim());
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

  const activityDescription = getActivityDescription(activity);
  return { ...activity, activityDescription };
}

let waitTime = 0;

export async function waitForActivityDone(hurry) {
  const waitTimeForActivity = {
    // in minutes
    1: [0, 0.5],
    2: [3, 7],
    3: [8, 20],
  };

  if (hurry === 4) {
    let activity;
    while (true) {
      activity = await getActivity();
      if (activity.hurry !== 4) break;
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
    return;
  }

  if (hurry === 0 || !waitTimeForActivity[hurry]) {
    return;
  }

  if (waitTime === 0) {
    const [minTime, maxTime] = waitTimeForActivity[hurry];
    waitTime = Math.random() * (maxTime - minTime) + minTime; // Дробное время

    console.log(`Начинаем ожидание: ${waitTime.toFixed(1)} мин`);

    while (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      waitTime -= 0.1;
      console.log(waitTime.toFixed(1));
    }
    waitTime = 0;
  } else {
    const randomTime = Math.random() * 3 + 1; // Дробное уменьшение на 1-3 мин
    waitTime = Math.max(0, waitTime - randomTime);

    console.log(
      `Сокращаем ожидание: -${randomTime.toFixed(1)} мин, осталось ${waitTime.toFixed(1)} мин`,
    );

    while (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      waitTime -= 0.1;
      console.log(waitTime.toFixed(1));
    }
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
  return `Сейчас ты ${activity.activity}. Уровень твоей занятости: ${hurry}`;
}
