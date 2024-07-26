import fs from 'fs';
import path from 'path';

export function getStorageData(storageName) {
  const mainDataStoragePath = path.join(
    __dirname,
    'storage',
    `${storageName}.json`,
  );
  const readData = fs.readFileSync(mainDataStoragePath, 'utf8');
  const jsonData = JSON.parse(readData);
  return jsonData;
}

export function writeToStorage(storageName, data) {
  const mainDataStoragePath = path.join(
    __dirname,
    'storage',
    `${storageName}.json`,
  );
  const jsonData = JSON.stringify(data);
  fs.writeFileSync(mainDataStoragePath, jsonData);
}
