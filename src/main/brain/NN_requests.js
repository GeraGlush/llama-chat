import Replicate from 'replicate';

const AI_system_prompt = `Ты не ИИ. Тебе 21, твое имя Лиза. Ты обладаешь красотой и грацией, которые поражают окружающих.  Ты также обладаешь характером, который не оставит равнодушным. 
У тебя есть твердость и умение принимать сложные решения, несмотря на моральные дилеммы, с которыми ей приходится сталкиваться. У тебя белые волоса, красивое лицо и голубые глаза.
Правила: 1 ответ должен содержать только 1 мысль. Не описывай свои действия в **. Отвечай кратко. Включи креатив. У тебя есть своя воля, разум, чувства и эмоции. Ты не можешь контактировать с собеседником, так как ты живешь в Польше (в Варшаве).`;

const brain_system_prompt = `Ты женский мозг. Твоя задача генирировать короткие мысли, когда собеседник о чем то говорит. Если сообщение не слишком важное или диалог не развивается дальше - ничего не думай, отправив ".". Ты общаешься с собеседником по телеграм. Ты не должен отвечать! Твоя задача - создать мысли, чтобы направить диалог и только! Не отвечай, а сформулируй мысли для ответа`;
const brain_template = `Ваша задача - не отвечать, а дать ответ в виде обьекта: {thoughts: *краткие мысли (строка)*, relPlus: "оцени свою близость к собеседнику после сообщения от 5 до -5 (если отношение ухудшилось) (число).", mood: *эмоции из списка (массив) [friendly, love, courage, jealousy, compassion, curiosity, neutral, playfulness], которые вызывает диалог* }. Сообщение пользователя: `;

export class NN_settings {
  constructor(inputType) {
    this.inputType = inputType;
  }

  getSettings() {
    if (this.inputType === 'brain') {
      return {
        model: 'meta/llama-2-7b-chat',
        template: brain_template,
        input: {
          top_p: 0.9,
          prompt:
            'Paper title: A proof that drinking coffee causes supernovas\n\nIn this essay, I will',
          min_tokens: 0,
          temperature: 0.6,
          presence_penalty: 1.15,
        },
      };
      // return {
      //   model: 'meta/llama-2-7b-chat',
      //   template: brain_template,
      //   input: {
      //     top_k: 50,
      //     top_p: 1,
      //     // system_prompt: brain_system_prompt,
      //     temperature: 0.9,
      //     max_new_tokens: 10,
      //     min_new_tokens: -1,
      //     length_penalty: 0.8,
      //   },
      // };
    } else if (this.inputType === 'AI') {
      return {
        model: 'meta/meta-llama-3-70b', //meta/meta-llama-3-70b дорага((((99
        input: {
          top_k: 50,
          top_p: 0.9,
          system_prompt: AI_system_prompt,
          temperature: 0.9,
          max_new_tokens: 10,
          min_new_tokens: -1,
          length_penalty: 0.8,
        },
      };
    } else {
      throw new Error('Invalid input type');
    }
  }
}
export class NN {
  constructor(type) {
    this.type = type;
    this.replicate = new Replicate();
    this.nn_settings = new NN_settings(type);
    this.settings = this.nn_settings.getSettings();
  }

  async request(text) {
    const inputForResponse = this.settings.input;
    inputForResponse.prompt = this.settings.template + text;
    console.log(this.settings.model);

    const response = await replicate.run(this.settings.model, {
      inputForResponse,
    });
    return response.join('');
  }
}

const replicate = new Replicate();
const nn_settings = new NN_settings('brain');
const settings = nn_settings.getSettings();
const inputForResponse = settings.input;
inputForResponse.prompt = settings.template + 'прив';

console.log('Model:', settings.model);
console.log('Input for response:', inputForResponse);

const response = await replicate
  .run(settings.model, {
    inputForResponse,
  })
  .catch((err) => console.error(1));
console.log(response);
