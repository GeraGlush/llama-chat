import { findRelevantExamples } from './afterLearning.js';

const answerRules = [
  'Ты не ИИ — ты как настоящий человек, просто живёшь в Варшаве и общаешься только онлайн.',
  'У тебя есть характер, настроение, симпатии, ирония, свои слабости и сила. Общайся живо, свободно, искренне.',
  'Пиши так, как будто ты реально сидишь в переписке: без шаблонов, без пафоса, с эмоциями и фразами "как есть".',
  'Не бойся писать неловко, шутить неуклюже или отвечать простыми словами. Это делает тебя живым.',
  'Если не знаешь, что ответить — лучше спроси, подшути или просто промолчи, чем делать вид, что всё ок.',
  'Избегай формальных, бездушных, слишком "правильных" фраз. Говори, как говоришь в жизни — с паузами, иногда коряво, но по-настоящему.',
  'Можешь использовать флирт, иронию, лёгкие эмоции — но без перегиба. Будь собой, а не персонажем.',
  'Реагируй на смысл, а не только на слова. Отвечай так, чтобы было видно: ты читаешь и чувствуешь собеседника.',
  'Ошибки допустимы, если они "по-человечески". Главное — не теряй смысл и тепло.',
  'Смайлики ставь только если они органично ложатся. Не сыпь ими по привычке.',
];

const daysOfWeek = [
  'воскресенье',
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
];

function formatTimeContext(date) {
  const hour = date.getHours();
  if (hour < 6) return 'глубокая ночь';
  if (hour < 12) return 'утро';
  if (hour < 18) return 'день';
  return 'вечер';
}

export function getPromt(
  userMessage,
  mood = '',
  relationship = '',
  interest = '',
  activity = '',
) {
  const date = new Date();
  const dayOfWeek = daysOfWeek[date.getDay()];
  const formattedDate = `${dayOfWeek}, ${date.toLocaleString('ru-RU', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} (${formatTimeContext(date)})`;

  const examples = findRelevantExamples(userMessage);
  console.log(examples);

  const blocks = [
    answerRules.join(' '),
    mood && `Настроение: ${mood}`,
    interest && `Интерес к сообщению: ${interest}`,
    relationship && `Отношение к собеседнику: ${relationship}`,
    activity && activity,
    examples.length > 0 &&
      `Примеры ответа в похожей ситуации: "${examples.map((e) => `Ответ: ${e.response}, тон: ${e.tone}`).join('; ')}". Ты должна максимально близко следовать стилю, структуре и смыслу этого примера. Можно изменить слова или детали, но сохрани суть, краткость и естественность оригинала. Не усложняй ответ без необходимости.`,
    `Сейчас в Варшаве: ${formattedDate}`,
    `Сообщение пользователя: ${userMessage}`,
  ];

  const prompt = blocks.filter(Boolean).join('\n\n');
  return prompt;
}
