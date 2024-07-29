import fs from 'fs';
import path from 'path';

const currentDir = path.resolve();
const __dirname = path.join(currentDir, '../');

export function getFileData(storageName) {
  const mainDataStoragePath = storageName.includes('/Users/')
    ? storageName
    : path.join(__dirname, storageName);
  const readData = fs.readFileSync(mainDataStoragePath, 'utf8');
  const jsonData = JSON.parse(readData);
  return jsonData;
}

export async function scanDir(dir) {
  const dirPath = path.join(__dirname, dir);

  try {
    await fs.promises.access(dirPath);
    const files = await fs.promises.readdir(dirPath);
    return files.map((file) => path.join(dirPath, file));
  } catch (err) {
    console.error(`Error reading directory: ${err.message}`);
    return [];
  }
}

export function setFilesData(storageName, data) {
  const mainDataStoragePath = storageName.includes('/Users/')
    ? storageName
    : path.join(__dirname, storageName);
  const jsonData = JSON.stringify(data);
  fs.writeFileSync(mainDataStoragePath, jsonData);
}
