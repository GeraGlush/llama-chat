import { getFileData, setFileData } from '../../helpers';

export async function getMood(userId) {
  const data = await getFileData(`peoples/${userId}.json`);
  return data.mood;
}

export async function setMood(newMood, userId) {
  const currentMood = await getMood(userId);
}
