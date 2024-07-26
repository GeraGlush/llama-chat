import fs from 'fs';
import path from 'path';

const __dirname = path.join(path.resolve(), 'src');

export function getFileData(storageName) {
  const mainDataStoragePath = path.join(__dirname, 'storage', storageName);
  const readData = fs.readFileSync(mainDataStoragePath, 'utf8');
  const jsonData = JSON.parse(readData);
  return jsonData;
}

export async function scanDir(dir) {
  const dirPath = path.join(__dirname, dir);
  console.log(dirPath);

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
  const mainDataStoragePath = path.join(__dirname, 'storage', storageName);
  const jsonData = JSON.stringify(data);
  fs.writeFileSync(mainDataStoragePath, jsonData);
}
