import { emotionLexicon } from './emotions.js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

// Hugging Face API
const API_URL =
  'https://api-inference.huggingface.co/models/seara/rubert-tiny2-russian-emotion-detection-ru-go-emotions';
const API_TOKEN = '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';

export async function getNewMood(text) {
  try {
    const response = await axios.post(
      API_URL,
      { inputs: text },
      { headers: { Authorization: `Bearer ${API_TOKEN}` } },
    );

    // ✅ Исправляем проблему с двойным массивом
    const predictions = response.data[0] || [];

    return mapToCustomEmotions(predictions);
  } catch (error) {
    console.log(error.message);

    console.log('Ошибка распознования эмоций! Пробуем еще раз...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return getNewMood(text);
  }
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
          !detectedEmotions.includes(customEmotion)
        ) {
          detectedEmotions.push({ emotion: customEmotion, score });
        }
      }
    }
  });

  console.log(detectedEmotions);

  return detectedEmotions.length > 0
    ? detectedEmotions
    : [{ emotion: 'neutral', score: 1 }];
}

export function countRewar(mood) {
  const positiveEmotionsWithReward = {
    happy: 3,
    excited: 2,
    tenderness: 3,
    devotion: 2,
    kind: 1,
    grateful: 2,
    friendly: 1,
    love: 4,
    compassion: 1,
  };
  const negativeEmotionsWithReward = {
    guilt: -2,
    fear: -2,
    shame: -2,
    confused: -1,
    disappointed: -1,
    resentment: -2,
    audacious: -2,
    angry: -2,
    anxious: -2,
    depressed: -2,
  };

  let reward = 0;
  mood.forEach((emotion) => {
    if (positiveEmotionsWithReward[emotion]) {
      reward += positiveEmotionsWithReward[emotion];
    } else if (negativeEmotionsWithReward[emotion]) {
      reward += negativeEmotionsWithReward[emotion];
    }
  });

  return reward;
}
