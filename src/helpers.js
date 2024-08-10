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

export async function scanDir(dir) {
  const dirPath = dir.includes('/Users/') ? dir : path.join(__dirname, dir);

  try {
    await fs.promises.access(dirPath);
    const files = await fs.promises.readdir(dirPath);
    return files.map((file) => path.join(dirPath, file));
  } catch (err) {
    console.error(`Error reading directory: ${err.message}`);
    return [];
  }
}

export function setFileData(storageName, data) {
  const mainDataStoragePath = storageName.includes('/Users/')
    ? storageName
    : path.join(__dirname, storageName);
  const jsonData = JSON.stringify(data);
  fs.writeFileSync(mainDataStoragePath, jsonData);
}
