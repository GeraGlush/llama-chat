import { getFileData } from '../../helpers.js';

export async function relationshipPlus(relPlus, relationshipWithPeople) {
  const relationships = await getFileData('storage/relationship.json');

  if (!relationshipWithPeople) {
    return {
      step: 1,
      points: 10,
      description: relationships.steps[1].description,
    };
  }

  if (typeof relPlus !== 'number' || relPlus === 0)
    return relationshipWithPeople;

  let { step, points } = relationshipWithPeople;
  points += relPlus;

  const nextStep = relationships.steps[step + 1];
  if (nextStep && points >= nextStep.pointsToGet) {
    step++;
  }

  return {
    step,
    points,
    description: relationships.steps[step].description,
    message: relationships.steps[step]?.message || null,
  };
}

export async function getRelationship(userId) {
  const relationships = await getFileData('storage/relationship.json');
  const userRelationship = await getFileData(`peoples/${userId}.json`);
  return relationships.steps[userRelationship.step];
}
