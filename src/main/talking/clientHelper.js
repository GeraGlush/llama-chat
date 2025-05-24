import { Api } from 'telegram';
import { shuffleArray } from '../../helpers.js';

export async function setTypingStatus(client, username) {
  try {
    await client.invoke(
      new Api.messages.SetTyping({
        peer: username,
        action: new Api.SendMessageTypingAction(),
      }),
    );
  } catch (error) {}
}

export async function readMessages(client, peer) {
  try {
    await client.invoke(
      new Api.messages.ReadHistory({
        peer,
      }),
    );
  } catch (err) {}
}

export async function cancelTypingStatus(client, username) {
  try {
    await client.invoke(
      new Api.messages.SetTyping({
        peer: username,
        action: new Api.SendMessageCancelAction(),
      }),
    );
  } catch (error) {}
}

function isEmoji(str) {
  // Удаляем variation selector (U+FE0F), чтобы он не ломал распознавание
  const cleaned = str.normalize('NFC').replace(/\uFE0F/g, '');
  // Проверка, состоит ли строка из одного emoji или двух (например, 👨‍👩‍👧‍👦)
  return (
    cleaned.match(/^\p{Extended_Pictographic}$/u) !== null ||
    [...cleaned].every((char) => /\p{Emoji}/u.test(char))
  );
}

export async function sendReaction(client, username, emoji) {
  const allStickers = await client.invoke(
    new Api.messages.GetAllStickers({ hash: 0 }),
  );

  if (!isEmoji(emoji)) {
    console.log(`🚫 '${emoji}' не emoji — пропускаем отправку`);
    return;
  }

  console.log(`Получено ${allStickers.sets.length} стикерпаков`);

  const matchedStickers = [];

  for (const set of allStickers.sets) {
    console.log(`Проверяем пак: ${set.title}`);

    const inputSet = new Api.InputStickerSetID({
      id: set.id,
      accessHash: set.accessHash,
    });

    const fullSet = await client.invoke(
      new Api.messages.GetStickerSet({ stickerset: inputSet }),
    );

    for (const doc of fullSet.documents) {
      const isMatch = doc.attributes.some(
        (attr) =>
          attr instanceof Api.DocumentAttributeSticker && attr.alt === emoji,
      );
      if (isMatch) {
        matchedStickers.push(doc);
      }
    }
  }

  if (matchedStickers.length > 0) {
    shuffleArray(matchedStickers); // 👈 Перемешали
    const randomSticker = matchedStickers[0]; // 👈 Взяли первый
    console.log(`🎲 Выбран случайный стикер с ${emoji}`);
    await client.sendFile(username, {
      file: randomSticker,
      forceDocument: false,
    });
  } else {
    console.log(`❌ Не найден стикер с emoji ${emoji}, отправляем emoji`);
    await client.sendMessage(username, {
      message: emoji,
    });
  }
}
