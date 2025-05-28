import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { Api } from 'telegram';

// Установить путь к ffmpeg бинарнику
ffmpeg.setFfmpegPath(ffmpegPath);

export async function saveMainShotsFromVideo(userId, userDir, videoPath) {
  const framePath = path.join(userDir, 'shot.jpg');

  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  // Извлечение кадра (на 1-й секунде)
  await new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['1'],
        filename: path.basename(framePath),
        folder: userDir,
        size: '640x?'
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Кадр видео успешно сохранен в: ${framePath}`);
  return framePath;
}

export async function transcribeAudio(client, update) {
  const mime = update.message.media?.document?.mimeType;
  const isVoiceMessage = mime?.startsWith('audio/ogg') || mime === 'video/mp4';
  if (!isVoiceMessage) return null;

  try {
    await client.invoke(
      new Api.messages.ForwardMessages({
        fromPeer: update.message.peerId,
        id: [update.message.id],
        toPeer: 'Speechpro_ASR_bot',
      }),
    );

    const botPeer = await client.getEntity('Speechpro_ASR_bot');
    let recognizedText = '';

    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const history = await client.invoke(
        new Api.messages.GetHistory({
          peer: botPeer,
          limit: 1,
        }),
      );
      const lastMessage = history.messages[0];
      if (
        lastMessage &&
        lastMessage.message &&
        !lastMessage.message.includes('Распознаю голос')
      ) {
        recognizedText = lastMessage.message.replace('🗣 ', '');
        break;
      }
    }
    
    return recognizedText || null;
  } catch (err) {
    console.error('Ошибка при распознавании аудио:', err);
    return null;
  }
}
