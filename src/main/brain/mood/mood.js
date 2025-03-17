import { getFileData, setFileData } from '../../../helpers.js';
import { emotions } from './emotions.js';

export async function getMood(userId) {
  const data = await getFileData(`peoples/${userId}.json`);
  return data.mood;
}

function getRandomMood() {
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
  const emotionsPower = {
    happy: 0.1,
    playfulness: 0.3,
    neutral: 0.1,
    guilt: 0.5,
    thrilled: 1,
    pleased: 1,
    confused: 1,
    disappointed: 1,
    friendly: 1,
    love: 1.5,
    jealousy: 2.5,
    compassion: 1,
    curiosity: 1,
    tenderness: 2.5,
    devotion: 1.5,
    talkativeness: 0.5,
    angry: 2,
    resentment: 1,
    audacious: 3,
    sadness: 2,
    anxious: 1,
    calm: 0.5,
    depressed: 2,
  };

  const conflicts = {
    happy: ['sadness', 'depressed', 'guilt'],
    sadness: ['happy', 'thrilled', 'pleased'],
    angry: ['calm', 'pleased', 'friendly'],
    calm: ['angry', 'resentment'],
    depressed: ['happy', 'pleased'],
    anxious: ['calm', 'happy'],
  };
  const person = await getFileData(`peoples/${userId}.json`);

  if (!person.mood) {
    person.mood = {};
  }

  newMoods.forEach((newMood) => {
    if (emotions.includes(newMood)) {
      if (person.mood[newMood]) {
        person.mood[newMood] += emotionsPower[newMood];
      } else {
        person.mood[newMood] = emotionsPower[newMood];
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
      person.mood[mood] -= 0.2;
    }
  });

  await setFileData(`peoples/${userId}.json`, person);
}

export async function getMoodsDescription(userId) {
  console.log('getMoodsDescription');

  const mood = await getMood(userId);
  const descriptions = await getFileData('storage/moodsDescription.json');
  console.log('+');

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

  return descriptionsMood.join('\n');
}
