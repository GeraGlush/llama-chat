import { getFileData, setFileData } from '../../helpers';

export async function getMood(userId) {
  const data = await getFileData(`peoples/${userId}.json`);
  return data.mood;
}

export async function setMood(newMood, userId) {
  const currentMood = await getMood(userId);
  const person = await getFileData(`peoples/${userId}.json`);
}

//напиши функцию для того, чтобы не было разных настроений вместе по типу "happy, sad" или exited, sad и т.д.
function removeOpositeMoods(mood) {
  const opositeMood = {
    happy: 'sad',
    exited: 'sad',
    sad: 'happy',
    exited: 'happy',
    exited: 'sad',
    depressed: 'happy',
    calm: 'angry',
    angry: 'calm',
    anxious: 'calm',
    calm: 'anxious',
    devotion: 'resentment',
    resentment: 'devotion',
    resentment: 'compassion',
    compassion: 'resentment',
    love: 'jealousy',
    jealousy: 'love',
    friendly: 'angry',
    angry: 'friendly',
    kind: 'angry',
    angry: 'kind',
  };

  for (const one of mood) {
    const pointsOfOne = one.points;
  }
}
