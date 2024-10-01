import { getFileData, setFileData } from '../../../helpers.js';

export async function getMood(userId) {
  const data = await getFileData(`peoples/${userId}.json`);
  return data.mood;
}

function getRandomMood() {
  const emotions = [
    'happy',
    'playfulness',
    'neutral',
    'guilt',
    'thrilled',
    'pleased',
    'confused',
    'disappointed',
    'friendly',
    'love',
    'jealousy',
    'compassion',
    'curiosity',
    'tenderness',
    'devotion',
    'angry',
    'resentment',
    'audacious',
    'sadness',
    'anxious',
    'calm',
    'depressed',
  ];
  return emotions[Math.floor(Math.random() * emotions.length)];
}

export async function generateRandomMood(userId) {
  const person = await getFileData(`peoples/${userId}.json`);
  const random = () => {
    return Math.floor(Math.random() * 3) + 1;
  };
  person.mood = {
    [getRandomMood()]: random(),
  };
  await setFileData(`peoples/${userId}.json`, person);
}

export async function setMood(newMoods, userId) {
  const emotions = [
    'happy',
    'playfulness',
    'neutral',
    'guilt',
    'thrilled',
    'pleased',
    'confused',
    'disappointed',
    'friendly',
    'love',
    'jealousy',
    'compassion',
    'curiosity',
    'tenderness',
    'devotion',
    'angry',
    'resentment',
    'audacious',
    'sadness',
    'anxious',
    'calm',
    'depressed',
  ];

  const conflicts = {
    happy: ['sadness', 'depressed', 'guilt'],
    sadness: ['happy', 'thrilled', 'pleased'],
    angry: ['calm', 'pleased', 'friendly'],
    calm: ['angry', 'resentment'],
    depressed: ['happy', 'thrilled', 'pleased'],
    anxious: ['calm', 'happy'],
  };
  const person = await getFileData(`peoples/${userId}.json`);

  if (!person.mood) {
    person.mood = {};
  }

  newMoods.forEach((newMood) => {
    if (emotions.includes(newMood)) {
      if (person.mood[newMood]) {
        person.mood[newMood] += 1;
      } else {
        person.mood[newMood] = 1;
      }
    } else {
      person.mood[newMood] = 0;
    }
  });

  Object.keys(person.mood).forEach((mood) => {
    if (conflicts[mood]) {
      conflicts[mood].forEach((conflictMood) => {
        if (person.mood[conflictMood]) {
          delete person.mood[conflictMood];
        }
      });
    }
  });

  Object.keys(person.mood).forEach((mood) => {
    if (!newMoods.includes(mood) && person.mood[mood] > 0) {
      person.mood[mood] -= 0.3;
    }
  });

  console.log('Mood:', person.mood);
  await setFileData(`peoples/${userId}.json`, person);
}

export async function getMoodsDescription(userId) {
  const mood = await getMood(userId);
  const descriptions = await getFileData('storage/moodsDescription.json');

  const descriptionsMood = [];
  Object.entries(mood).forEach(([moodName, moodValue]) => {
    if (descriptions[moodName]) {
      if (moodValue > 0.5 && moodValue <= 1) {
        descriptionsMood.push(descriptions[moodName].low);
      } else if (moodValue > 1 && moodValue < 2) {
        descriptionsMood.push(descriptions[moodName].middle);
      } else if (moodValue >= 2) {
        descriptionsMood.push(descriptions[moodName].high);
      }
    }
  });

  console.log('----------'); // log
  console.log(
    descriptionsMood
      .sort((a, b) => b.length - a.length)
      .splice(3)
      .join(' '),
  );
  console.log('----------');

  return descriptionsMood
    .sort((a, b) => b.length - a.length)
    .splice(3)
    .join(' ');
}
