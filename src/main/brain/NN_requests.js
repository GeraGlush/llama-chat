import Replicate from 'replicate';

export class NN {
  constructor() {
    this.replicate = new Replicate();
  }

  async request(dialog) {
    let dialogWithNames = dialog.map((message) => {
      return {
        role: message.speaker,
        name: message.name,
        thoughts: message.thoughts,
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
    const prevData = await Promise.all([interestPromise, moodPromise]);

    const thoughtPromise =
      prevData[0] >= 6
        ? this.generateThoughtsResponse(dialogWithNames, prevData[1])
        : null;
    const thoughts = thoughtPromise ? await thoughtPromise : '';

    const finalResponse = {
      mood: prevData[1] ?? [],
      interest: prevData[0],
      relPlus: this.countRewar(prevData[1]),
      thoughts,
    };

    return finalResponse;
  }

  async generateMoodResponse(dialogWithNames) {
    const emotions = [
      'happy',
      // 'excited',
      'kind',
      'neutral',
      'nofeeling',
      'confused',
      'disappointed',
      'grateful',
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

    const emojiRegex =
      /[\p{Emoji}\p{Emoji_Component}\p{Extended_Pictographic}]/gu;
    const dialogWitoutEmoji = dialogWithNames.replace(emojiRegex, '');
    const prompt = ` Analyze the conversation and generate emotions from face of your owner messages (Я/Лиза), to messages of the interlocutor.
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

  async generateThoughtsResponse(dialogWithNames, mood) {
    const prompt = `Ты не ИИ, ты женский мозг.
      Твоя задача - сформулировать ЛОГИЧНУЮ мысль НА ОСНОВЕ диалога. 
      Если сообщение не слишком важное или диалог не развивается дальше - ничего не думай, отправив ".". Тебе нельзя генерировать флирт или пошлую мысль.
      В ответ дай только свою короткие мысль. Не описывай свои действия. Ты мозг. Генерируй мысль на русском и исходя из диалога и твоих эмоий сейчас.
      Твои эмоции: ${mood.join(', ')}. Мысль, беря их в учет. Не мысли по своему, а исходя из диалога и эмоций.
      Диалог: ${dialogWithNames}. Сгенерируй на основе диалога и эмоций мысль. Не отвечай на диалог!
    `;

    const model = 'mistralai/mixtral-8x7b-instruct-v0.1';
    const input = {
      top_p: 0.9,
      prompt,
      system_prompt: `Ты женский мозг. Твоя задача генирировать одну короткую мысль на основе диалога и эмоций. Не отвечай на диалог!`,
      min_tokens: 1,
      max_tokens: 70,
      temperature: 0.6,
      presence_penalty: 0.3,
    };

    const response = await this.replicate
      .run(model, { input })
      .catch((err) => console.error(err));

    return response
      .join('')
      .replace(/\*.*?\*/g, '')
      .replace('\n', '');
  }

  async generateInterest(dialogWithNames) {
    const prompt = `Оцени интерес диалога от 2 до 8. Диалог: ${dialogWithNames}. 2 - совсем не интересно, 8 - очень интересно. Если разговор долго идет на одну и ту же тему - выдай от 3 до 5.`;
    const model = 'meta/llama-2-7b-chat';
    const input = {
      top_p: 0.9,
      prompt,
      system_prompt: `Ответь одной цифрой от 2 до 8`,
      min_tokens: 1,
      max_tokens: 15,
      temperature: 0.6,
      presence_penalty: 0.3,
      stop: ['\n', ' '], // остановить генерацию после первой цифры
    };
    const response = await this.replicate
      .run(model, { input })
      .catch((err) => console.error(err));

    const number = Number(response.join('').match(/\d+/g)[0]);
    return number ?? 0;
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
