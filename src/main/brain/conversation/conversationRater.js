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
      'Ты обязана отвечать эмоционально, активно и подробно. Поддерживай темп, задавай вопросы, добавляй эмоции.',
    интересный:
      'Ты должна отвечать развернуто и с живостью. Не сокращай ответы, поддерживай беседу и задавай вопросы.',
    обычный:
      'Отвечай спокойно, без лишних эмоций. Разрешается минимальное участие в разговоре.',
    скучный:
      'Ты обязана отвечать кратко и без деталей. Не развивай тему, не задавай вопросы.',
    однообразный:
      'Отвечай минимально. Не добавляй эмоций и не проявляй энтузиазм.',
    глупый:
      'Разрешено отвечать иронично или игнорировать. Если отвечаешь, делай это сухо и без интереса.',
    информативный:
      'Ты обязана отвечать чётко, лаконично и без эмоций. Избегай лишних деталей.',
    странный:
      'Ты обязана отвечать осмысленно, осторожно и не терять нить разговора.',
    эмоциональный:
      ' Поддерживай эмоциональный тон, отражай настроение собеседника.',
    смешной:
      'Ты обязана отвечать весело, поддерживать шутки и вносить элементы юмора в ответ.',
  };

  const responseLength = getResponseLength(interestScore);
  return `${descriptions[type] || 'Диалог нейтральный.'} ${responseLength}`;
}

export async function rateConversation(person) {
  const dialog = person.dialog;
  const lastConversationRate = person.conversation;
  const lastMessages = dialog.map((msg) => msg.content).join('. ');
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

    let mainType = result.labels[0]; // Главная категория
    let interestScore = result.scores[0]; // Уверенность в категории

    // Коррекция оценки интересности
    if (wordCount < 10) interestScore -= 0.2;
    if (repeatedPhrases > 2) interestScore -= 0.3;
    if (questionCount > 1) interestScore += 0.1 * questionCount;
    if (mainType === 'интересный' && interestScore < 0.5) mainType = 'обычный';
    if (mainType === 'скучный' && interestScore > 0.5) {
      mainType = 'обычный';
      interestScore -= 0.3;
    }

    if (
      mainType === 'интересный' ||
      (mainType === 'обычный' && interestScore < 0.4)
    )
      mainType = 'скучный';

    interestScore = Math.max(0, Math.min(1, interestScore));

    // Учитываем предыдущую оценку и вводим плавные изменения
    if (lastConversationRate) {
      const prevScore = lastConversationRate.interestScore;
      interestScore =
        prevScore + Math.max(-0.3, Math.min(0.3, interestScore - prevScore));
      interestScore = Math.max(0, Math.min(1, interestScore)); // Ограничиваем в пределах 0-1
    }

    // Корректируем границы interestScore в зависимости от типа диалога
    if (mainType === 'скучный') {
      interestScore = Math.min(interestScore, 0.5); // Скучный диалог не может быть слишком интересным
    } else if (mainType === 'обычный') {
      interestScore = Math.max(0.3, Math.min(interestScore, 0.7)); // Обычный в пределах 0.3 - 0.7
    } else if (mainType === 'интересный') {
      interestScore = Math.max(0.6, interestScore); // Интересный не может быть слишком низким
    }

    return {
      type: mainType,
      interestScore,
      description: getDialogTypeDescription(mainType, interestScore),
    };
  } catch (error) {
    console.log('Ошибка при оценке диалога. Использую прошлые данные...');

    return person.conversation;
  }
}

function countRepeatedPhrases(dialog) {
  const phrases = dialog.map((msg) => msg.content.toLowerCase().trim());
  const uniquePhrases = new Set(phrases);
  return phrases.length - uniquePhrases.size;
}

function countQuestions(dialog) {
  return dialog.reduce(
    (count, msg) => count + (msg.content.includes('?') ? 1 : 0),
    0,
  );
}

function getResponseLength(interestScore) {
  if (interestScore < 0.3) return 'Не отвечай.';
  if (interestScore < 0.5)
    return 'Ответь коротко, без деталей. Не развивай разговор.';
  if (interestScore < 0.7)
    return 'Ответь по делу. Можно один вопрос или лёгкий переход к другой теме.';
  if (interestScore < 0.9)
    return 'Ответь с интересом, поддержи разговор, задай вопрос.';

  return 'Ответь с душой — можешь раскрыться, пошутить или завести новую тему.';
}
