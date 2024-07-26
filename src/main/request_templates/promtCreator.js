import { getStorageData } from '../../helpers.js';

const dataFilePath = path.join(__dirname, 'data', 'data.json');
const rulesFilePath = path.join(__dirname, 'data', 'rules.json');

export function getPromt(userMessage) {
  const rules = getStorageData('rules');

  let request;
  // request = `Отношение к собеседнику: ${data.relationship}:`;
  request += 'Правила ответа на сообщение: ';

  request += getMoodSpecialDescription();

  rules.forEach((element) => {
    request += element + ',';
  });

  request += 'Твой интерес к сообщению собеседника: ' + getInterest();

  request += data.answerRules;
  request += 'Твое настроение: ' + getMoodDescription();

  if (userMessage.includes('фото')) {
    userMessage.replace('фото', '*фото*');
  }

  request += `Сообщение пользователя: ${userMessage}`;
  console.log(request);

  const result = {
    self: self,
    request: request,
  };

  return result;
}

function getData(filePath) {
  const readData = fs.readFileSync(filePath, 'utf8');
  const jsonData = JSON.parse(readData);
  return jsonData;
}
