import axios from 'axios';

const API_URL =
  'https://api-inference.huggingface.co/models/MoritzLaurer/deberta-v3-large-zeroshot-v2.0';
const API_TOKEN = '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';

const CATEGORIES = [
  'захватывающий',
  'интересный',
  'обычный',
  'скучный',
  'однообразный',
  'глупый',
  'информативный',
  'странный',
  'эмоциональный',
  'смешной',
];
function getDialogTypeDescription(type, interestScore) {
  const descriptions = {
    захватывающий:
      'Диалог очень увлекательный, требует эмоционального и активного ответа.',
    интересный: 'Диалог интересный, стоит отвечать подробно и с живостью.',
    обычный: 'Диалог нейтральный, можно отвечать спокойно и без лишних эмоций.',
    скучный: 'Диалог скучный и однообразный, отвечай кратко и без деталей.',
    однообразный:
      'Диалог повторяющийся и предсказуемый, можно отвечать минимально.',
    глупый:
      'Диалог бессмысленный или нелепый, можно отвечать с иронией или игнорировать.',
    информативный: 'Диалог содержит факты, стоит отвечать чётко и без эмоций.',
    странный:
      'Диалог необычный или сбивающий с толку, отвечай осторожно и осмысленно.',
    эмоциональный: 'Диалог насыщен эмоциями, поддерживай эмоциональный фон.',
    смешной:
      'Диалог содержит юмор, можно отвечать весело и поддерживать шутки.',
  };
  return `Итоговая оценка диалога: ${type} (${interestScore.toFixed(2)}). ${descriptions[type] || 'Диалог нейтральный.'}`;
}

// 🔹 Оценка диалога
async function evaluateConversation(dialog) {
  const lastMessages = dialog
    .slice(-5)
    .map((msg) => msg.content)
    .join(' ');
  const wordCount = lastMessages.split(/\s+/).length;
  const repeatedPhrases = countRepeatedPhrases(dialog);
  const questionCount = countQuestions(dialog);

  try {
    const response = await axios.post(
      API_URL,
      { inputs: lastMessages, parameters: { candidate_labels: CATEGORIES } },
      { headers: { Authorization: `Bearer ${API_TOKEN}` } },
    );

    const result = response.data;
    console.log('🔍 Hugging Face Анализ:', result);

    let mainType = result.labels[0]; // Главная категория диалога
    let interestScore = result.scores[0]; // Уверенность в главной категории

    // Коррекция оценки интересности
    if (wordCount < 10) interestScore -= 0.2;
    if (repeatedPhrases > 2) interestScore -= 0.3;
    if (questionCount > 1) interestScore += 0.2;
    interestScore = Math.max(0, Math.min(1, interestScore));

    return {
      type: mainType,
      interestScore,
      description: getDialogTypeDescription(mainType, interestScore),
      details: { wordCount, repeatedPhrases, questionCount },
    };
  } catch (error) {
    console.error(
      '❌ Ошибка анализа диалога:',
      error.response?.data || error.message,
    );
    return {
      type: 'обычный',
      interestScore: 0.5,
      description: getDialogTypeDescription('обычный', 0.5),
      details: {},
    };
  }
}

// 🔹 Подсчёт повторов
function countRepeatedPhrases(dialog) {
  const phrases = dialog.map((msg) => msg.content.toLowerCase().trim());
  const uniquePhrases = new Set(phrases);
  return phrases.length - uniquePhrases.size;
}

// 🔹 Подсчёт вопросов
function countQuestions(dialog) {
  return dialog.reduce(
    (count, msg) => count + (msg.content.includes('?') ? 1 : 0),
    0,
  );
}

// 🔹 Определение длины ответа
function getResponseLength(type, interestScore) {
  if (interestScore < 0.3) return 'Короткий ответ или игнорирование.';
  if (['захватывающий', 'интересный'].includes(type) && interestScore > 0.7)
    return 'Длинный, живой ответ.';
  if (['скучный', 'однообразный', 'глупый'].includes(type))
    return 'Минимальный ответ.';
  return 'Средний ответ.';
}

// 🔹 Генерация финального промта для GPT
function generatePrompt(dialogAnalysis) {
  return `Контекст разговора:\n${dialogAnalysis.description}\n\nУровень интересности: ${dialogAnalysis.interestScore.toFixed(2)}.\n${getResponseLength(dialogAnalysis.type, dialogAnalysis.interestScore)}`;
}

// 🚀 **Пример использования**
(async () => {
  const dialog = [
    { role: 'user', content: 'Ты не поверишь, что со мной сегодня произошло!' },
    { role: 'assistant', content: 'Ого, рассказывай! Уже заинтриговала 😮' },
    {
      role: 'user',
      content: 'Я встретил старого друга, которого не видел 10 лет!',
    },
    { role: 'assistant', content: 'Вау, это точно судьба! Как он?' },
    {
      role: 'user',
      content: 'Отлично! Мы болтали пару часов, столько воспоминаний всплыло.',
    },
  ];

  const dialogAnalysis = await evaluateConversation(dialog);
  console.log(
    `📊 Итоговая оценка: ${dialogAnalysis.type} (${dialogAnalysis.interestScore})`,
  );
  console.log(`📖 Описание: ${dialogAnalysis.description}`);
  console.log(
    `📝 Длина ответа: ${getResponseLength(dialogAnalysis.type, dialogAnalysis.interestScore)}`,
  );
  console.log(`🎯 Промт для GPT:\n${generatePrompt(dialogAnalysis)}`);
})();
