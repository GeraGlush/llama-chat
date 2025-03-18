import { getFileData } from '../../helpers.js';

export async function generateRandomSchedule() {
  const weekDay = new Date().getDay(); // 0 - Sunday, 1 - Monday, ..., 6 - Saturday
  const schedule = [];

  const activities = await getFileData('/src/main/schedule/activities.json');

  schedule.push({
    duration: `00-${getRandomTime(7, 8)}`,
    hurry: 4,
    name: 'сон',
  });

  if (isWorkingDay(weekDay)) {
    schedule.push({
      duration: `${getRandomTime(9, 10)}-${getRandomTime(14, 16)}`,
      hurry: Math.floor(Math.random() * 3) + 2,
      name: 'работаешь',
    });
  }

  function addActivity(activity) {
    const startTime = isWorkingDay(weekDay)
      ? schedule[schedule.length - 1].duration.split('-')[1]
      : getRandomTime(10, 14);
    const endTime = getNextTime(startTime, activity.duration);
    const activityTime = `${startTime}-${endTime}`;
    if (activity.isInCity) {
      const travelTimeBefore = `${getPreviousTime(startTime, 0.5)}-${startTime}`;
      const travelTimeAfter = `${endTime}-${getNextTime(endTime, 0.75)}`;
      schedule.push({
        duration: travelTimeBefore,
        name: 'собираюсь, чтобы ' + activity.name,
      });
      schedule.push({
        duration: activityTime,
        name: activity.name,
        hurry: getRandomElFromAray(activity.hurry),
      });
      schedule.push({
        duration: travelTimeAfter,
        name: 'добираюсь домой с ' + activity.name,
        hurry: getRandomElFromAray(activity.hurry),
      });
    } else {
      schedule.push({
        duration: activityTime,
        name: activity.name,
        hurry: getRandomElFromAray(activity.hurry),
      });
    }
  }

  while (schedule.length < 5) {
    activities
      .sort(() => Math.random() - 0.5)
      .forEach((activity) => {
        const startTime = getRandomTime(8, 21);
        const endTime = getNextTime(startTime, activity.duration);
        const activityTime = `${startTime}-${endTime}`;
        if (
          Math.random() * 100 < activity.probability &&
          !schedule.some((item) => timeOverlap(item.duration, activityTime))
        ) {
          addActivity(activity);
        }
      });
  }

  schedule.push({
    duration: `${getRandomTime(21, 22)}-00`,
    hurry: 4,
    name: 'сон',
  });

  return schedule.sort((a, b) => a.duration.localeCompare(b.duration));
}

function getRandomTime(startHour, endHour) {
  const start = startHour + Math.floor(Math.random() * (endHour - startHour));
  const startMinute = Math.floor(Math.random() * 60);
  return `${String(start).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
}

function getNextTime(startTime, durationHours) {
  const [hours, minutes] = startTime.split(':').map((x) => parseInt(x));
  const endHours = hours + Math.floor(durationHours);
  const endMinutes = (minutes + (durationHours % 1) * 60) % 60;
  const nextHours =
    endHours + (minutes + (durationHours % 1) * 60 >= 60 ? 1 : 0);
  return `${String(nextHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

function getPreviousTime(startTime, durationHours) {
  const [hours, minutes] = startTime.split(':').map((x) => parseInt(x));
  const startHours = hours - Math.floor(durationHours);
  const startMinutes = (minutes - (durationHours % 1) * 60 + 60) % 60;
  const prevHours =
    startHours - (minutes - (durationHours % 1) * 60 < 0 ? 1 : 0);
  return `${String(prevHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`;
}

function timeOverlap(time1, time2) {
  const [start1, end1] = time1.split('-').map((t) => t.trim());
  const [start2, end2] = time2.split('-').map((t) => t.trim());
  const getTime = (time) => parseInt(time.replace(':', ''), 10);
  return getTime(start1) < getTime(end2) && getTime(start2) < getTime(end1);
}

function isWorkingDay(day) {
  return day > 0 && day < 6;
}

function getRandomElFromAray(array) {
  return array[Math.floor(Math.random() * array.length)];
}
