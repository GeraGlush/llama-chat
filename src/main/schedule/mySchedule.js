import fs from 'fs-extra';
import path from 'path';
import { generateRandomSchedule } from './generator.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const scheduleFile = path.join(__dirname, 'schedule.json');

function formatScheduleDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

async function ensureSchedule() {
  const today = formatScheduleDate();
  let scheduleExists = await fs.pathExists(scheduleFile);

  if (scheduleExists) {
    let scheduleData = await fs.readJson(scheduleFile);
    if (scheduleData.date === today) {
      return scheduleData.activities;
    }
  }
  const newSchedule = generateRandomSchedule();
  await fs.writeJson(scheduleFile, { date: today, activities: newSchedule });
  return newSchedule;
}

async function getCurrentActivity(activities) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

  const currentActivity = activities.find((entry) => {
    const [startTime, endTime] = entry.time.split('-').map((t) => t.trim());
    return currentTime >= startTime && currentTime < endTime;
  }) || { activity: 'Ничем не занята', hurry: [0] };

  return currentActivity;
}

export async function getActivity() {
  const activities = await ensureSchedule();
  const activity = await getCurrentActivity(activities);
  const activityDescription = getActivityDescription(activity);
  return activityDescription;
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
