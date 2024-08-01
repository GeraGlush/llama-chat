import Replicate from 'replicate';

export class NN {
  constructor(type) {
    this.type = type;
    this.replicate = new Replicate();
  }

  async request(dialog, mindset, relationshipDescription) {
    if (this.type === 'AI') {
      return await this.AIRequest(dialog, mindset, relationshipDescription);
    } else if (this.type === 'brain') {
      return await this.brainRequest(dialog);
    } else {
      throw new Error('Unknown NN type');
    }
  }

  async AIRequest(dialog, mindset, relDescription) {
    let dialogWithNames = dialog;
    dialogWithNames[0].text = `Последнее смс (реагируй на него): ${dialog[0].text}`;
    dialogWithNames = dialog
      .map((message) => {
        if (message.speaker === 'user') {
          return `${message.name}: "${message.text}"`;
        } else {
          return `Ты: "${message.text}"`;
        }
      })
      .join('. ');

    const model = 'meta/meta-llama-3-70b-instruct'; //meta/meta-llama-3.1-405b-instruct meta/meta-llama-3-70b-instruct
    const system_prompt = `Тебе 21, твое имя Лиза. Ты также обладаешь сильным характером, который не оставит равнодушным. У тебя белые волоса, красивое лицо и голубые глаза.
    Твое отношение к собеседнику: ${relDescription}. Правила: Ты общаешься с собеседником по телеграму. 1 ответ должен содержать только 1 мысль. Не описывай свои действия в **. Отвечай кратко. Включи креатив. Помни, ты не ИИ, ты человек`;
    const prompt = `Общайся только от своего лица (Я/Лиза) и по русски! Твои мысли: ${mindset.thoughts}. Твои эмоции: ${mindset.mood}. Исходя из мыслей, отношению к собеседнику и эмоций ответь на диалог. Ответь на русском! Диалог: ${dialogWithNames}. Не отвечай своими мыслями, а исходя из них построй ответ. Не повторяй прошлыйе сообщения. Если нечего сказать, ответь "."`;

    const input = {
      top_p: 0.9,
      prompt,
      system_prompt,
      length_penalty: 0.1,
      min_tokens: 1,
      max_tokens: 200,
      temperature: 0.6,
      length_penalty: 0.6,
    };

    const response = await this.replicate
      .run(model, { input })
      .catch((err) => console.error(err));

    return response
      .join('')
      .replace('"', '')
      .replace('Ты:', '')
      .replace('Лиза:', '')
      .replace('Lisa:', '')
      .replace('"', '')
      .replace("'", '')
      .replace('Я:', '');
  }

  async brainRequest(dialog) {
    let dialogWithNames = dialog;
    dialogWithNames[0].text = `Последнее смс (реагируй на него): ${dialog[0].text}`;
    dialogWithNames = dialog
      .map((message) => {
        if (message.speaker === 'user') {
          return `${message.name}: "${message.text}"`;
        } else {
          return `Ты: "${message.text}"`;
        }
      })
      .join('. ');

    const mood = await this.generateMoodResponse(dialogWithNames);
    const thought = await this.generateThoughtsResponse(dialogWithNames, mood);
    const finalResponse = {
      mood: mood ?? [],
      relPlus: this.countRewar(mood),
      thoughts: thought ?? '',
    };

    return finalResponse;
  }

  async generateMoodResponse(dialogWithNames) {
    const emotions = [
      'happy',
      'excited',
      'kind',
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
      'playfulness',
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
      playfulness: 1,
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
