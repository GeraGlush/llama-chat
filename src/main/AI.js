import Replicate from 'replicate';
import { request_templates } from './request_templates/promtCreator.js';

const replicate = new Replicate({
  auth: 'r8_EYsDbMDW910a9rXnlcuMJVdSBvoncH20E6TWp',
});

export function getAnswer(userMessage) {
  const generalData = getStorageData('myself');
  const prompt_template = generalData.self;

  const input = {
    top_k: 50,
    top_p: 0.9,
    prompt: userMessage,
    max_tokens: 512,
    min_tokens: 0,
    temperature: 0.6,
    prompt_template:
      '<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n' +
      prompt_template +
      '<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n',
    presence_penalty: 1.15,
    frequency_penalty: 0.2,
  };
}
