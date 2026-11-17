const test = require('node:test');
const assert = require('node:assert/strict');
const { validateMood, analyze } = require('../src/services/moodModel');
const { actionFor } = require('../src/services/moodService');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const valid = (score) => ({ score, label: 'balanced', responseText: 'A short response.' });

test('integer score boundaries map to the server-owned pet action', () => {
  for (const [score, action] of [[0,'comfort_all_five'],[59,'comfort_all_five'],[60,'normal'],[85,'normal'],[86,'celebrate_selected'],[100,'celebrate_selected']]) {
    assert.equal(validateMood(valid(score)).score, score);
    assert.equal(actionFor(score), action);
  }
  for (const score of [-1, 101, 59.5, '59', null, undefined]) assert.throws(() => validateMood(valid(score)));
  assert.throws(() => validateMood({ score: 60, label: 'wrong', responseText: 'Hello' }));
  assert.throws(() => validateMood({ score: 60, label: 'balanced', responseText: '' }));
});

test('provider failures have safe classifications and invalid responses do not pass', async () => {
  const priorProvider = process.env.AI_PROVIDER;
  const priorKeyFile = process.env.DEEPSEEK_KEY_FILE;
  const priorFetch = global.fetch;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'focusdesk-ai1-test-'));
  const keyFile = path.join(tempDir, 'key');
  fs.writeFileSync(keyFile, 'dummy-test-value');
  process.env.AI_PROVIDER = 'deepseek';
  process.env.DEEPSEEK_KEY_FILE = keyFile;
  try {
    for (const status of [401, 429, 500]) {
      global.fetch = async () => new Response('private upstream body', { status });
      await assert.rejects(analyze('A fictional day.'), (error) => error.statusCode === 503 && !error.message.includes('private'));
    }
    global.fetch = async () => { throw new Error('network details and dummy-test-value'); };
    await assert.rejects(analyze('A fictional day.'), (error) => error.statusCode === 503 && !error.message.includes('dummy-test-value'));
    global.fetch = async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(valid(59.5)) } }] }));
    await assert.rejects(analyze('A fictional day.'), (error) => error.statusCode === 502);
    global.fetch = async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: JSON.stringify(valid(60)) } }] }));
    await assert.rejects(analyze('A fictional day.'), (error) => error.statusCode === 502);
    global.fetch = async () => new Response('x'.repeat(32769));
    await assert.rejects(analyze('A fictional day.'), (error) => error.statusCode === 502);
    global.fetch = async (_url, options) => {
      const request = JSON.parse(options.body);
      assert.deepEqual(request.thinking, { type: 'disabled' });
      assert.equal(request.max_tokens, 512);
      assert.deepEqual(request.response_format, { type: 'json_object' });
      return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(valid(86)) } }] }));
    };
    assert.equal((await analyze('A fictional day.')).score, 86);
  } finally {
    global.fetch = priorFetch;
    if (priorProvider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = priorProvider;
    if (priorKeyFile === undefined) delete process.env.DEEPSEEK_KEY_FILE; else process.env.DEEPSEEK_KEY_FILE = priorKeyFile;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('a cancelled mock request stops before returning a result', async () => {
  const provider = process.env.AI_PROVIDER;
  const delay = process.env.MOCK_MOOD_DELAY_MS;
  process.env.AI_PROVIDER = 'mock';
  process.env.MOCK_MOOD_DELAY_MS = '5000';
  const controller = new AbortController();
  const pending = analyze('A fictional day.', controller.signal);
  controller.abort();
  try { await assert.rejects(pending, (error) => error.statusCode === 503); }
  finally {
    if (provider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = provider;
    if (delay === undefined) delete process.env.MOCK_MOOD_DELAY_MS; else process.env.MOCK_MOOD_DELAY_MS = delay;
  }
});
