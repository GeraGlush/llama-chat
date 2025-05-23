import { getFileData } from '../../../helpers.js';

export async function relationshipPlus(emotions, relationshipWithPeople) {
  const relationships = await await getFileData(
    '/src/main/brain/relationship/descriptions.json',
  );

  if (!relationshipWithPeople) {
    return {
      step: 1,
      points: 10,
      description: relationships.steps[1].description,
    };
  }

  const relPlus = countReward(emotions);

  if (typeof relPlus !== 'number' || relPlus === 0)
    return relationshipWithPeople;

  let { step, points } = relationshipWithPeople;
  points += relPlus;
  console.log('Отношение к собеседнику:', points);

  const nextStep = relationships.steps[step + 1];
  if (nextStep && points >= nextStep.pointsToGet) {
    step++;
  }

  return {
    step,
    points,
    description: relationships.steps[step].description,
  };
}

export async function getRelationship(userId) {
  const relationships = await await getFileData(
    '/src/main/brain/relationship/descriptions.json',
  );

  const userRelationship = await await getFileData(`peoples/${userId}.json`);
  return relationships.steps[userRelationship.step];
}

export function countReward(moodArray) {
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
    pleased: 2,
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

  moodArray.forEach(({ emotion, score }) => {
    if (positiveEmotionsWithReward[emotion] !== undefined) {
      reward += positiveEmotionsWithReward[emotion] * score;
    } else if (negativeEmotionsWithReward[emotion] !== undefined) {
      reward += negativeEmotionsWithReward[emotion] * score;
    }
  });

  return reward;
}
