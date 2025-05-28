import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

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
const projectName = process.env.PROJECT_NAME.toLowerCase();

const getKeyFromPath = (path) => {
  const parts = path.split('/');
  const rawKey = parts[parts.length - 1];
  
  if (rawKey.startsWith(projectName)) return rawKey;
  return `${projectName}_${rawKey}`;
};

import fs from 'fs';
import path from 'path';

const __dirname = path.resolve();

export function getFileData(storageName) {
  const mainDataStoragePath = storageName.includes('/Users/')
    ? storageName
    : path.join(__dirname, storageName);
  const readData = fs.readFileSync(mainDataStoragePath, 'utf8');
  const jsonData = JSON.parse(readData);
  return jsonData;
}

export async function get(key) {
  const value = await cache.get(getKeyFromPath(key));
  if (value) {
    try {
        return JSON.parse(value);
      } catch {
        return value;
      }  
  }
  return null;
}

export async function getKeys(path) {
  const keys = await cache.keys(`${projectName}_${path}`);
  return keys;
}

export async function del(key) {
  const redisKey = getKeyFromPath(key);
  const exists = await cache.exists(redisKey);
  if (exists) {
    await cache.del(redisKey);
    return true;
  }
  return false;
}

export async function set(key, data, options = {}) {
  const value = typeof data === 'object' ? JSON.stringify(data) : data;
  await cache.set(getKeyFromPath(key), value, options);
}

export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
