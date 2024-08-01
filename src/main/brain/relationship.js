import { getFileData } from '../../helpers.js';

export async function relationshipPlus(relPlus, relationshipWithPeople) {
  if (!relationshipWithPeople) {
    rel.step = 1;
    rel.points = 10;
    description = relationships.steps[1].description;
  }

  if (typeof relPlus !== 'number' || relPlus === 0) return;
  const relationships = await getFileData('storage/relationship.json');
  const rel = relationshipWithPeople;
  const currentStep = rel.step;
  rel.points += relPlus;

  const nextRelationship = relationships.steps[currentStep + 1];
  if (!nextRelationship) return rel;

  if (relationshipWithPeople.points >= nextRelationship.pointsToGet) {
    rel.step = currentStep + 1;

    if (nextRelationship.message !== '' && nextRelationship.message) {
      rel.message = nextRelationship.message;
      return rel;
    }
  }

  rel.description = relationships.steps[rel.step].description;
  return rel;
}

export async function getRelationship(userId) {
  const relationships = await getFileData('storage/relationship.json');
  const userRelationship = await getFileData(`peoples/${userId}.json`);
  return relationships.steps[userRelationship.step];
}
