import assert from 'node:assert/strict';
import { TOPICS, pageTopic, REFUSAL } from '../api/_lib/askI2cKnowledge.js';
import { boundedI2cHistory, compactI2cData, generateI2cAnswer, isI2cGreeting } from '../api/_lib/askI2cChat.js';

assert.equal(pageTopic('/connections'), 'connections');
assert.equal(pageTopic('/receivables'), 'receivables');
assert.equal(pageTopic('/unknown-page'), 'dashboard');
assert.ok(TOPICS.connections.faqs.length >= 3);
assert.ok(TOPICS.receivables.faqs.some(row => row.question.includes('collect')));
assert.equal(isI2cGreeting('Hello!'), true);
assert.equal(isI2cGreeting('What is my CCC?'), false);

const history = Array.from({ length: 20 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: `m${index}` }));
assert.equal(boundedI2cHistory(history).length, 12);
assert.ok(compactI2cData({ value: 'x'.repeat(100) }, 30).endsWith('[truncated]'));

process.env.OPENAI_API_KEY = 'test-key';
process.env.OPENAI_MODEL = 'gpt-5.6-luna';

const fakeFetch = async (_url, options) => {
  const body = JSON.parse(options.body);
  assert.equal(body.model, 'gpt-5.6-luna');
  assert.equal(body.text.format.name, 'i2c_answer');
  return {
    ok: true,
    async json() {
      return {
        status: 'completed',
        output: [{
          content: [{
            type: 'output_text',
            text: JSON.stringify({ in_scope: true, answer: 'Your CCC is 35 days.' }),
          }],
        }],
      };
    },
  };
};

const answer = await generateI2cAnswer(
  { product: 'i2cashflow', workspaceData: '{"ccc":35}' },
  [],
  'What is my CCC?',
  fakeFetch,
);
assert.equal(answer, 'Your CCC is 35 days.');

const refusalFetch = async () => ({
  ok: true,
  async json() {
    return {
      status: 'completed',
      output: [{ content: [{ type: 'output_text', text: JSON.stringify({ in_scope: false, answer: '' }) }] }],
    };
  },
});
assert.equal(await generateI2cAnswer({}, [], 'Tell me celebrity gossip', refusalFetch), REFUSAL);

console.log('✓ Ask i2C chat tests passed');
console.log(JSON.stringify({
  topics: Object.keys(TOPICS).length,
  connectionsSuggestions: TOPICS.connections.faqs.length,
  historyLimit: 12,
  scopedRefusal: true,
}, null, 2));
