import { getFileData, setFileData } from '../../../helpers.js';
import { emotions } from './emotions.js';

export async function getMood(userId) {
  const data = await getFileData(`peoples/${userId}.json`);
  return data.mood.emotions;
}

function getRandomMood() {
  return emotions[Math.floor(Math.random() * emotions.length)];
}

export async function generateRandomMood() {
  const random = () => {
    return Math.floor(Math.random() * 3) + 1;
  };

  return {
    [getRandomMood()]: random(),
  };
}

export async function getMoodDescription(emotions) {
  const descriptionsMood = [];
  const descriptions = await getFileData(
    '/src/main/brain/mood/descriptions.json',
  );

  // ✅ Проверяем, является ли `emotions` объектом, и конвертируем его в массив
  if (!Array.isArray(emotions)) {
    emotions = Object.entries(emotions); // Преобразуем в массив [муд, значение]
  }

  emotions.forEach(([moodName, moodValue]) => {
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
