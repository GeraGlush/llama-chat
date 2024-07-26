export async function newMessageResived(messageData) {
  const userId = update.message.peerId.userId;
  const text = update.message.message;
  console.log(`Получено сообщение от пользователя с ID ${userId}: ${text}`);
  console.log(messageData);
}
