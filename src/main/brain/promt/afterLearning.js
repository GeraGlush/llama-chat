import natural from 'natural';
const { PorterStemmerRu } = natural;
import { getFileData } from '../../../helpers.js';

function stem(str) {
  return str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .split(/\s+/)
    .map((word) => PorterStemmerRu.stem(word))
    .filter(Boolean);
}

function cosineSimilarity(words1, words2) {
  const set = Array.from(new Set([...words1, ...words2]));
  const vec1 = set.map((w) => (words1.includes(w) ? 1 : 0));
  const vec2 = set.map((w) => (words2.includes(w) ? 1 : 0));

  const dot = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0));

  return mag1 && mag2 ? dot / (mag1 * mag2) : 0;
}

const responseExamples = getFileData('src/main/brain/promt/learningData.json');

export function findRelevantExamples(
  userMessage,
  examples = responseExamples,
  threshold = 0.6,
  max = 1,
) {
  const userStems = stem(userMessage);

  return examples
    .map((example) => {
      const exampleStems = stem(example.input);
      const score = cosineSimilarity(userStems, exampleStems);
      return { ...example, score };
    })
    .filter((example) => example.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}
