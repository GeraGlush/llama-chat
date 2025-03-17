import Replicate from 'replicate';
import { emotions } from '../brain/mood/emotions.js';

export class NN {
  constructor() {
    this.replicate = new Replicate({
      auth: 'r8_QmMV9vJqZMsmpzrnznmKIyKMaFqjsTV4T8KvF',
    });
  }

  async request(dialog) {
    let dialogWithNames = dialog.map((message) => {
      return {
        role: message.speaker,
        name: message.name,
        content: message.content.replace(
          'Последнее смс (реагируй на него):',
          '',
        ),
      };
    });

    dialogWithNames[0].content = `Последнее смс (реагируй на него): ${dialog[0].content}`;
    dialogWithNames = dialog
      .map((message) => {
        if (message.speaker === 'user') {
          return `${message.name}: "${message.content}"`;
        } else {
          return `Ты: "${message.content}"`;
        }
      })
      .join('. ');

    const moodPromise = this.generateMoodResponse(dialogWithNames);
    const interestPromise = this.generateInterest(dialogWithNames);
    console.log('promises started');

    const prevData = await Promise.all([interestPromise, moodPromise]);
    console.log('promises ended');

    const finalResponse = {
      mood: prevData[1] ?? [],
      interest: prevData[0],
      relPlus: this.countRewar(prevData[1]),
    };

    return finalResponse;
  }

  async generateMoodResponse(dialogWithNames) {
    const emojiRegex =
      /[\p{Emoji}\p{Emoji_Component}\p{Extended_Pictographic}]/gu;
    const dialogWitoutEmoji = dialogWithNames.replace(emojiRegex, '');
    const prompt = ` Analyze the conversation and generate emotions from face of your owner messages (Я/Милена), to messages of the interlocutor.
    Choose emotions from the list: [${emotions.join(', ')}] end after give so short explain. AS ANSWER GIVE ONLY ARRAY max lenght of array = 3 emotion!
      Dialog: ${dialogWitoutEmoji}. What emotions do you have in relation to the other person? Say nothing, just generate emotions, what u you have in relation to the other person. Your answer should start from array of emotions.
    `;
    const model = 'meta/llama-2-7b-chat';
    const input = {
      top_p: 0.9,
      prompt,
      length_penalty: 0.1,
      system_prompt: `You are woman brain. U should generate emotions from the list: [${emotions.join(', ')}]. U couldn't talk, only generate emotions.`,
      min_tokens: 1,
      max_tokens: 70,
      temperature: 0.6,
      length_penalty: 0.3,
    };

    const response = await this.replicate
      .run(model, { input })
      .catch((err) => console.error(err));

    const array = [];
    const text = response.join('').toLowerCase();

    for (let i = 0; i < emotions.length; i++) {
      const emotion = emotions[i];
      if (text.includes(emotion)) {
        array.push(emotion);
      }
    }
    return array;
  }

  async generateInterest(dialogWithNames) {
    const prompt = `Оцени интерес диалога от 2 до 8. Диалог: ${dialogWithNames}. 2 - совсем не интересно, 8 - очень интересно. Если разговор долго идет на одну и ту же тему - выдай от 3 до 5.`;

    const model = 'meta/llama-2-7b-chat';
    const input = {
      top_p: 0.9,
      prompt,
      system_prompt: `Ответь одной цифрой от 2 до 8`,
      min_tokens: 1,
      max_tokens: 5, // Снизил до 5, так как нужно одно число
      temperature: 0.4, // Уменьшил случайность для более стабильных результатов
      presence_penalty: 0.3,
      stop: ['\n', ' '],
    };

    try {
      const response = await Promise.race([
        this.replicate.run(model, { input }),
        new Promise(
          (_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    'Timeout: generateInterest слишком долго выполняется',
                  ),
                ),
              5000,
            ), // 5 секунд таймаут
        ),
      ]);

      if (!response) return 3; // Если нет ответа, ставим 3 (нейтральный интерес)

      const matchedNumbers = response.join('')?.match(/\d+/g);
      const number = Number(matchedNumbers ? matchedNumbers[0] : 3); // Если не найдено число, ставим 3
      return Math.max(2, Math.min(8, number)); // Гарантия, что число в диапазоне 2-8
    } catch (error) {
      console.error('Ошибка в generateInterest:', error);
      return 3; // В случае ошибки возвращаем 3, чтобы не стопорить код
    }
  }

  countRewar(mood) {
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
}
