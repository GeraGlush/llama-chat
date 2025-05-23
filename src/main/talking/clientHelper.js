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

function isEmoji(char) {
  const code = char.codePointAt(0);
  return (
    (code >= 0x1f300 && code <= 0x1f6ff) || // Misc Symbols and Pictographs, Transport
    (code >= 0x1f900 && code <= 0x1f9ff) || // Supplemental Symbols and Pictographs
    (code >= 0x1fa70 && code <= 0x1faff) || // Symbols and Pictographs Extended-A
    (code >= 0x2600 && code <= 0x26ff) || // Misc symbols (like ☀️, ☕)
    (code >= 0x2700 && code <= 0x27bf) || // Dingbats
    (code >= 0x1f000 && code <= 0x1f02f) // Mahjong, Domino, etc.
  );
}

export async function sendReaction(client, username, emojiInput) {
  const emoji =
    typeof emojiInput === 'number'
      ? String.fromCodePoint(emojiInput)
      : emojiInput;

  if (!isEmoji(emoji)) {
    console.log(`🚫 ${emoji} не emoji — отправляем как текст`);
    await client.sendMessage(username, { message: emoji });
    return;
  }

  const allStickers = await client.invoke(
    new Api.messages.GetAllStickers({ hash: 0 }),
  );

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
