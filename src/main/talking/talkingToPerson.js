import { NewMessage } from 'telegram/events/index.js';
import { answerToSinglePerson } from './answer.js';
import { Api } from 'telegram';
import { watchFunctions } from '../schedule/mySchedule.js';
import {
  fetchLatestMessages,
} from './clientHelper.js';
import { transcribeAudio, saveMainShotsFromVideo } from './transcribator.js';
import {handleCommand} from './commands.js';  
import fs from 'fs';
import path from 'path';

let talking = false;

export async function startTalkingToPerson(client, person) {
  const setup = async (client, person) => {
    talking = true;
    client.addEventHandler((update) => {
      handleNewMessage(update, client, person);
    }, new NewMessage({}));

    watchFunctions(client, person);
    console.log(`Listening for new messages from ${person.username}...`);
  };

  const newMessages = await fetchLatestMessages(client, person);
  console.log(`Found ${newMessages.length} new messages from ${person.username}.`);

  for (const message of newMessages) {
    await handleNewMessage({ message }, client, person);
  }

  if (!talking) await setup(client, person);
}

async function handleNewMessage(update, client, person) {
  if (!update.message?.peerId?.userId?.value) return;

  const userId = Number(update.message.peerId.userId.value);
  if (userId !== person.userId) return;

  const messageDate = new Date(update.message.date * 1000);
  if (person.lastMessageDate && messageDate.getTime() <= person.lastMessageDate) return;

  const media = update.message.media;
  const isDocument = media instanceof Api.MessageMediaDocument;
  const document = isDocument ? media.document : null;

  const textFromVoice = await transcribeAudio(client, update, userId);
  let text = update.message?.message?.trim() || '' || textFromVoice || '';
  if (update.message?.message && update.message?.message.startsWith('/')) {
    await handleCommand(client, person, update.message.message);
    return;
  }

  const userDir = path.join('files', 'users', String(userId));
  fs.mkdirSync(userDir, { recursive: true });

  // === Обработка видео (например, кружки) ===
  const isVideo = isDocument && document?.attributes?.some(attr =>
    attr instanceof Api.DocumentAttributeVideo,
  );

  if (isVideo) {    
    const userDir = path.join('files', 'users', String(userId));
    const videoPath = path.join(userDir,'video.mp4');
    const buffer = await client.downloadMedia(media);
    fs.writeFileSync(videoPath, buffer);

    await saveMainShotsFromVideo(userId, userDir, videoPath);
    fs.unlinkSync(videoPath); // удалить исходник

    text ||= await transcribeAudio(client, update, userId);
    console.log(`Кружок от ${person.username} распознан: ${text}`);
    

    await answerToSinglePerson(client, person, `Тебе отправили кружок. Кадр из кружка загружен как файл, вот его текст: ${text}`);
    return;
  }

    // === Обработка обычных фото ===
  if (media instanceof Api.MessageMediaPhoto && media.photo) {
    const fileName = `photo_${Date.now()}.jpg`;
    const filePath = path.join(userDir, fileName);
    const buffer = await client.downloadMedia(media);
    fs.writeFileSync(filePath, buffer);

    text ||= `[отправлено фото]`;
    await answerToSinglePerson(client, person, text);
    return;
  }

  // === Обработка стикеров ===
  const isSticker = isDocument && document?.attributes?.some(a => a instanceof Api.DocumentAttributeSticker);
  if (isSticker) {
    const stickerAlt = document.attributes.find(a => a instanceof Api.DocumentAttributeSticker)?.alt;
    const text = `Стикер: ${stickerAlt}`;
    await answerToSinglePerson(client, person, text);
    return;
  }

  // === Обработка других файлов (PDF, архивы и т.п.) ===
  if (isDocument) {
    const nameAttr = document.attributes?.find(attr => attr.fileName);
    const fileName = nameAttr?.fileName || `file_${Date.now()}`;
    const filePath = path.join(userDir, fileName);

    const buffer = await client.downloadMedia(media);
    fs.writeFileSync(filePath, buffer);

    const text = `[отправлен файл: ${fileName}]`;
    await answerToSinglePerson(client, person, text);
    return;
  }


  // === Обработка текста / стикеров ===
  const stickerDescription =
    (document?.attributes?.find(a => a instanceof Api.DocumentAttributeSticker)?.alt &&
      `Стикер: ${document.attributes.find(a => a instanceof Api.DocumentAttributeSticker).alt}`) ||
    '';

  text ||= stickerDescription;

  if (text) {
    await answerToSinglePerson(client, person, text);
  }
}