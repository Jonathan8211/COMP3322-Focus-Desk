import assert from 'node:assert/strict';
import test from 'node:test';
import { petResponseView } from '../src/contexts/petResponse.js';

test('task celebration takes visual priority over mood response', () => {
  assert.deepEqual(petResponseView('walk', true, 'comfort_all_five'), { comfort: false, moodCelebrating: false, state: 'celebrate' });
  assert.deepEqual(petResponseView('eat', true, 'celebrate_selected'), { comfort: false, moodCelebrating: false, state: 'celebrate' });
  assert.deepEqual(petResponseView('sleep', false, 'comfort_all_five'), { comfort: true, moodCelebrating: false, state: 'sleep' });
  assert.deepEqual(petResponseView('walk', false, 'celebrate_selected'), { comfort: false, moodCelebrating: true, state: 'celebrate' });
  assert.deepEqual(petResponseView('walk', false, 'normal'), { comfort: false, moodCelebrating: false, state: 'walk' });
});
