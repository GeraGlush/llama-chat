import { Api } from 'telegram';

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

export async function sendReaction(client, username, messageId, emoji = '❤️') {
  try {
    await client.invoke(
      new Api.messages.SendReaction({
        peer: username,
        msgId: messageId,
        reaction: [new Api.ReactionEmoji({ emoticon: emoji })],
        big: false,
        addToRecent: true,
      }),
    );
  } catch (error) {
    if (error.errorMessage !== 'MESSAGE_NOT_MODIFIED') {
      throw error;
    }
  }
}
