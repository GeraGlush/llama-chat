import 'dotenv/config';

async function redisClient() {
  const cache = createClient({
    socket: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
    password: process.env.REDIS_PASSWORD,
  });

  await cache.connect();
  return cache;
}

export const cache = await redisClient();

const getKeyFromPath = (path) => {
  const parts = path.split('/');
  return parts[parts.length - 1].replace('.json', '');
};

export async function getFileData(key) {
  const value = await cache.get(getKeyFromPath(key));
  return JSON.parse(value);
}

export async function getFileData(key) {
  const value = await cache.get(getKeyFromPath(key));
  if (value) {
    return JSON.parse(value);
  }
  return null;
}

export async function getKeys(path) {
  const keys = await cache.keys(path);
  return keys;
}

export async function setFileData(key, data) {
  const value = JSON.stringify(data);
  await cache.set(getKeyFromPath(key), value);
}

export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
