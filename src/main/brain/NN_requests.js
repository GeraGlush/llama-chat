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

    const model = 'meta/meta-llama-3-70b-instruct';
    const system_prompt = `Тебе 21, твое имя Лиза. Ты также обладаешь сильным характером, который не оставит равнодушным. У тебя белые волоса, красивое лицо и голубые глаза.
    Твое отношение к собеседнику: ${relDescription}. Правила: Ты общаешься с собеседником по телеграму. 1 ответ должен содержать только 1 мысль. Не описывай свои действия в **. Отвечай кратко. Включи креатив. Помни, ты не ИИ, ты человек`;
    const prompt = `Общайся только от своего лица (Я/Лиза) и по русски! Твои мысли: ${mindset.thoughts}. Твои эмоции: ${mindset.mood}. Исходя из мыслей, отношению к собеседнику и эмоций ответь на диалог. Ответь на русском! Диалог: ${dialogWithNames}`;

    const input = {
      top_p: 0.9,
      prompt,
      system_prompt,
      length_penalty: 0.1,
      min_tokens: 1,
      max_tokens: 200,
      temperature: 0.6,
      length_penalty: 0.3,
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

    const moodResponse = this.generateMoodResponse(dialogWithNames);
    const relationshipResponse =
      this.generateRelationshipResponse(dialogWithNames);
    const thoughtsResponse = this.generateThoughtsResponse(dialogWithNames);
    const done = await Promise.all([
      moodResponse,
      relationshipResponse,
      thoughtsResponse,
    ]);

    const finalResponse = {
      mood: done[0] ?? [],
      relPlus: done[1] ?? 0,
      thoughts: done[2] ?? '',
    };

    return finalResponse;
  }

  async generateMoodResponse(dialogWithNames) {
    const prompt = `Ответь на вопрос: "Какие эмоции вызвал диалог?".
    Выбери эмоции из списка: [friendly, love, courage, jealousy, compassion, curiosity, neutral, playfulness] и обьясни почему ты выбрал их.
      Диалог: ${dialogWithNames}. Структура ответа: должна быть такой: сначало число, потом краткое обьяснение почему именно оно. Пиши эмоции по английски, как в примере.
    `;

    const model = 'meta/llama-2-7b-chat';
    const input = {
      top_p: 0.9,
      prompt,
      length_penalty: 0.1,
      system_prompt: `Ты женский мозг. Твоя задача генирировать эмоции. Твоя задача - создать эмоции, чтобы направить диалог и только!`,
      min_tokens: 1,
      max_tokens: 50,
      temperature: 0.6,
    };

    const response = await this.replicate
      .run(model, { input })
      .catch((err) => console.error(err));

    const emotions = [
      'friendly',
      'love',
      'courage',
      'jealousy',
      'compassion',
      'curiosity',
      'neutral',
      'playfulness',
    ];

    const array = [];
    for (let i = 0; i < emotions.length; i++) {
      const emotion = emotions[i];
      if (response.join('').includes(emotion)) {
        array.push(emotion);
      }
    }
    return array;
  }

  async generateRelationshipResponse(dialogWithNames) {
    const prompt = `
    Твоя задача - оценить близость отношений с собеседником после диалога. 
    Оцени свою близость к собеседнику от 5 до -5. 
    Положительное число - отношения стали ближе от 1 до 5, отрицательное - ухудшилось от -1 до -5, смотря насколько сильно ухудшились.
    Напиши сначало число в скобках, а потом очень кратко обьясни почему именно это число.
    Диалог: ${dialogWithNames}
  `;

    const model = 'meta/llama-2-7b-chat';
    const input = {
      top_p: 0.9,
      prompt,
      system_prompt: `Ты женский мозг. Твоя задача генирировать число близости отношений после диалога от 5 до -5.`,
      min_tokens: 1,
      max_tokens: 40,
      temperature: 0.6,
    };

    const response = await this.replicate
      .run(model, { input })
      .catch((err) => console.error(err));
    try {
      return Number(
        response.join('').replace('-5 to 5').match(/-?\d+/)[0] ?? 0,
      );
    } catch (err) {
      return 0;
    }
  }

  async generateThoughtsResponse(dialogWithNames) {
    const prompt = `Ты не ИИ, ты женский мозг.
      Твоя задача - сформулировать мысли на основе диалога. 
      Если сообщение не слишком важное или диалог не развивается дальше - ничего не думай, отправив ".". 
      В ответ дай только свои короткие мысли. Не описывай свои действия. Ты мозг. Генерируй мысли на русском и исходя из диалога.
  
      Диалог: ${dialogWithNames}
    `;

    const model = 'meta/llama-2-13b-chat';
    const input = {
      top_p: 0.9,
      prompt,
      system_prompt: `Ты женский мозг. Твоя задача генирировать мысли на основе диалога. Не отвечай на диалог!`,
      min_tokens: 1,
      max_tokens: 70,
      temperature: 0.6,
      presence_penalty: 0.5,
    };

    const response = await this.replicate
      .run(model, { input })
      .catch((err) => console.error(err));

    return response.join('').replace(/\*.*?\*/g, '');
  }
}
