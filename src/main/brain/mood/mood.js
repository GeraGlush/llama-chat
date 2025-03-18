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

export async function getUpdatedMood(mood, newMoods) {
  const conflicts = {
    happy: ['sadness', 'depressed', 'guilt', 'envy'],
    sadness: ['happy', 'thrilled', 'pleased'],
    angry: ['calm', 'pleased', 'friendly'],
    calm: ['angry', 'resentment'],
    depressed: ['happy', 'pleased'],
    anxious: ['calm', 'happy'],
    fear: ['calm', 'pleased'],
    guilt: ['happy', 'pleased'],
  };

  newMoods.forEach(({ emotion, score }) => {
    console.log({ emotion, score });

    if (emotions.includes(emotion)) {
      if (mood[emotion]) {
        mood[emotion] += score;
      } else {
        mood[emotion] = score;
      }
    } else {
      mood[emotion] = 0;
    }
  });

  Object.keys(mood).forEach((mood) => {
    if (conflicts[mood]) {
      conflicts[mood].forEach((conflictMood) => {
        if (mood[conflictMood]) {
          delete mood[conflictMood];
        }
      });
    }
  });

  Object.keys(mood).forEach((mood) => {
    if (!newMoods.includes(mood) && mood[mood] > 0) {
      mood[mood] -= 0.1;
    }
  });

  return mood;
}

export async function getMoodDescription(mood) {
  const descriptionsMood = [];
  const descriptions = await getFileData(
    '/src/main/brain/mood/descriptions.json',
  );

  Object.entries(mood).forEach(([moodName, moodValue]) => {
    if (descriptions[moodName]) {
      if (moodValue > 0.5 && moodValue <= 1) {
        descriptionsMood.push(descriptions[moodName].low);
      } else if (moodValue > 1 && moodValue < 2) {
        descriptionsMood.push(descriptions[moodName].middle);
      } else if (moodValue >= 2) {
        descriptionsMood.push(descriptions[moodName].high);
      }
    } else {
      console.log(`⚠️ Описание для ${moodName} не найдено`);
    }
  });

  return descriptionsMood
    .sort((a, b) => b.length - a.length)
    .slice(0, 3)
    .join('\n');
}
