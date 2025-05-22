import { Api } from 'telegram';

export async function setTypingStatus(client, username) {
  await client.invoke(
    new Api.messages.SetTyping({
      peer: username,
      action: new Api.SendMessageTypingAction(),
    }),
  );
}

export async function cancelTypingStatus(client, username) {
  await client.invoke(
    new Api.messages.SetTyping({
      peer: username,
      action: new Api.SendMessageCancelAction(),
    }),
  );
}

export async function sendReaction(client, username, messageId, emoji = '❤️') {
  await client.invoke(
    new Api.messages.SendReaction({
      peer: username,
      msgId: messageId,
      reaction: [new Api.ReactionEmoji({ emoticon: emoji })],
      big: false,
      addToRecent: true,
    }),
  );
}
