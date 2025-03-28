import { getFileData, setFileData } from '../../../helpers.js';
import { emotions } from './emotions.js';

export async function getMood(userId) {
  const data = await getFileData(`peoples/${userId}.json`);
  return data.mood.emotions;
}

function getRandomMood() {
  return emotions[Math.floor(Math.random() * emotions.length)];
}

export async function generateRandomMood(userId) {
  const person = await getFileData(`peoples/${userId}.json`);
  const random = () => {
    return Math.floor(Math.random() * 3) + 1;
  };
  person.mood.emotions = {
    [getRandomMood()]: random(),
  };
  await setFileData(`peoples/${userId}.json`, person);
}

// Функция сопоставления эмоций с твоими категориями
function mapToCustomEmotions(predictions) {
  const threshold = 0.1; // Убираем эмоции с низкой уверенностью
  let detectedEmotions = [];

  predictions.forEach(({ label, score }) => {
    if (score >= threshold) {
      for (const [customEmotion, synonyms] of Object.entries(emotionLexicon)) {
        if (
          synonyms.includes(label) &&
          !detectedEmotions.some((e) => e.emotion === customEmotion)
        ) {
          detectedEmotions.push({ emotion: customEmotion, score });
        }
      }
    }
  });

  return detectedEmotions.length > 0
    ? detectedEmotions
    : [{ emotion: 'neutral', score: 1 }];
}

export function getUpdatedMood(previousEmotions, newEmotions) {
  const DECAY_RATE = 0.02; // Снижаем "устаревшие" эмоции на 0.02 за сообщение
  let updatedEmotions = { ...previousEmotions }; // Делаем копию объекта

  const newEmotionsMap = Object.fromEntries(
    newEmotions.map((e) => [e.emotion, e.score]),
  );

  for (const emotion in previousEmotions) {
    if (newEmotionsMap[emotion] !== undefined) {
      updatedEmotions[emotion] = newEmotionsMap[emotion];
    } else {
      updatedEmotions[emotion] = Math.max(
        previousEmotions[emotion] - DECAY_RATE,
        0,
      );

      if (updatedEmotions[emotion] <= 0) {
        delete updatedEmotions[emotion];
      }
    }
  }

  newEmotions.forEach(({ emotion, score }) => {
    if (!(emotion in updatedEmotions)) {
      updatedEmotions[emotion] = score;
    }
  });

  // Проверяем нейтральность
  const hasNeutral = 'neutral' in newEmotionsMap;
  if (hasNeutral) {
    updatedEmotions['neutral'] = newEmotionsMap['neutral'];
  } else if ('neutral' in updatedEmotions) {
    updatedEmotions['neutral'] = Math.max(
      updatedEmotions['neutral'] - DECAY_RATE,
      0,
    );
    if (updatedEmotions['neutral'] <= 0) {
      delete updatedEmotions['neutral'];
    }
  }

  return updatedEmotions;
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
