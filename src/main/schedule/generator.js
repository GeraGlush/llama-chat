export function generateRandomSchedule() {
  const weekDay = new Date().getDay(); // 0 - Sunday, 1 - Monday, ..., 6 - Saturday
  const schedule = [];

  const activities = [
    {
      name: 'кушаешь еду',
      probability: 100,
      duration: 0.5,
      hurry: [0, 1],
      isInCity: false,
    },
    {
      name: 'в церкви',
      probability: weekDay === 0 ? 90 : 0,
      duration: 2,
      hurry: [1, 2],
      isInCity: true,
    },
    {
      name: 'готовлюсь к экзаменам',
      probability: isWorkingDay(weekDay) ? 20 : 0,
      duration: 2,
      hurry: [2, 4],
      isInCity: false,
    },
    {
      name: 'тренеруешься в тренажёрном зал',
      probability: 50,
      duration: 1,
      hurry: [1],
      isInCity: true,
    },
    {
      name: 'встречаешься с подругами в кафе',
      probability: 45,
      duration: 1.5,
      hurry: [1],
      isInCity: true,
    },
    {
      name: 'шопинг',
      probability: 40,
      duration: 1.5,
      hurry: [1, 2],
      isInCity: true,
    },
    {
      name: 'учишься',
      probability: isWorkingDay(weekDay) ? 0 : 70,
      duration: 3,
      hurry: [0, 1, 3],
      isInCity: true,
    },
    {
      name: 'отдыхаешь',
      probability: 90,
      duration: 2,
      hurry: [0],
      isInCity: false,
    },
    {
      name: 'гуляешь',
      probability: 80,
      duration: 1.5,
      hurry: [0],
      isInCity: true,
    },
    {
      name: 'читаешь',
      probability: 70,
      duration: 1,
      hurry: [0, 4],
      isInCity: false,
    },
    {
      name: 'смотришь сериал',
      probability: 50,
      duration: 1.5,
      hurry: [0],
      isInCity: false,
    },
    {
      name: 'играешь в игры',
      probability: 40,
      duration: 1.5,
      hurry: [0],
      isInCity: false,
    },
    {
      name: 'общаешься с друзьями',
      probability: 30,
      duration: 2,
      hurry: [1, 2],
      isInCity: true,
    },
    {
      name: 'прогуливаешься',
      probability: 70,
      duration: 1.5,
      hurry: [0],
      isInCity: true,
    },
    {
      name: 'посещаешь мероприятие',
      probability: 20,
      duration: 2,
      hurry: [2, 3],
      isInCity: true,
    },
    {
      name: 'покупаешь продукты',
      probability: 50,
      duration: 1,
      hurry: [1],
      isInCity: false,
    },
    {
      name: 'делаешь уборку',
      probability: 40,
      duration: 1.5,
      hurry: [1],
      isInCity: false,
    },
    {
      name: 'готовишь',
      probability: 60,
      duration: 1.5,
      hurry: [1],
      isInCity: false,
    },
    {
      name: 'посещаешь родственников',
      probability: 30,
      duration: 2,
      hurry: [2],
      isInCity: true,
    },
    {
      name: 'проводишь время с друзьями',
      probability: 50,
      duration: 2,
      hurry: [2],
      isInCity: true,
    },
    {
      name: 'пьешь кофе в кофейне',
      probability: 40,
      duration: 1.5,
      hurry: [2],
      isInCity: true,
    },
    {
      name: 'встречаешься с друзьями',
      probability: 30,
      duration: 2,
      hurry: [2],
      isInCity: true,
    },
    {
      name: 'смотришь фильм',
      probability: 50,
      duration: 1.5,
      hurry: [0, 1],
      isInCity: false,
    },
  ];

  if (isWorkingDay(weekDay)) {
    schedule.push({
      time: `${getRandomTime(8, 9)}-${getRandomTime(14, 16)}`,
      hurry: Math.floor(Math.random() * 3) + 2,
      activity: 'работаешь',
    });
  }

  function addActivity(activity) {
    const startTime = getRandomTime(8, 21);
    const endTime = getNextTime(startTime, activity.duration);
    const activityTime = `${startTime}-${endTime}`;
    if (activity.isInCity) {
      const travelTimeBefore = `${getPreviousTime(startTime, 0.5)}-${startTime}`;
      const travelTimeAfter = `${endTime}-${getNextTime(endTime, 0.75)}`;
      schedule.push({
        time: travelTimeBefore,
        activity: 'собираюсь, чтобы ' + activity.name,
      });
      schedule.push({
        time: activityTime,
        activity: activity.name,
        hurry: getRandomElFromAray(activity.hurry),
      });
      schedule.push({
        time: travelTimeAfter,
        activity: 'добираюсь домой с ' + activity.name,
        hurry: getRandomElFromAray(activity.hurry),
      });
    } else {
      schedule.push({
        time: activityTime,
        activity: activity.name,
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
          !schedule.some((item) => timeOverlap(item.time, activityTime))
        ) {
          addActivity(activity);
        }
      });
  }

  schedule.push({
    time: `${getRandomTime(22, 23)}-${getRandomTime(7, 9)}`,
    hurry: 4,
    activity: 'сон',
  });

  return schedule.sort((a, b) => a.time.localeCompare(b.time));
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
