import { getFileData } from '../../helpers.js';

export async function relationshipPlus(relPlus, relationship) {
  if (typeof relPlus !== 'number' || relPlus === 0) return;
  const relationships = await getFileData('storage/relationship.json');
  const rel = relationship;
  const currentStep = rel.step;
  rel.points += relPlus;

  const nextRelationship = relationships.steps[currentStep + 1];
  if (relationship.points >= nextRelationship.pointsToGet) {
    rel.step = currentStep + 1;

    // if (nextRelationship.message !== '' && nextRelationship.message) {
    //   return nextRelationship.message;
    // }
  }

  return rel;
}
