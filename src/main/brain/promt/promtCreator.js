import { get } from '../../../helpers.js';

export async function getPromt(name = 'Герман') {
  let promt = await get('promt');
  const varibles = [{ name: 'NAME', value: name }];
  varibles.forEach(({ name, value }) => {
    promt = promt.replace(new RegExp(`{${name}}`, 'g'), value);
  });

  return promt;
}
