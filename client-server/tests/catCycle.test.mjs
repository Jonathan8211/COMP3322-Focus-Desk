import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCatCycle, chooseWalkDirection, walkAfter, walkFacingKeyframes, walkWaypoints,
  CAT_TRAVERSE_MS, CAT_WALK_MIN_MS, CAT_WALK_MAX_MS,
  CAT_REST_MIN_MS, CAT_REST_MAX_MS, CAT_CELEBRATE_MS,
} from '../src/contexts/catCycle.js';

const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} ≈ ${expected}`);

function fakeClock() {
  let time = 0;
  let id = 0;
  const pending = new Map();
  return {
    now: () => time,
    schedule(callback, delay) { const nextId = ++id; pending.set(nextId, { at: time + delay, callback }); return nextId; },
    cancel(nextId) { pending.delete(nextId); },
    get pending() { return pending.size; },
    advance(duration) {
      const end = time + duration;
      let fired = 0;
      while (true) {
        const due = [...pending].sort((a, b) => a[1].at - b[1].at)[0];
        if (!due || due[1].at > end) break;
        if (++fired > 100) throw new Error('Timer loop');
        time = due[1].at;
        pending.delete(due[0]);
        due[1].callback();
      }
      time = end;
    },
  };
}

function setup(values = [0.75]) {
  const clock = fakeClock();
  let draws = 0;
  const cycle = createCatCycle({ ...clock, random: () => values[(draws++) % values.length] });
  assert.equal(draws, 0);
  cycle.setMode({ enabled: true, visible: true, reduce: false });
  return { clock, cycle, get draws() { return draws; } };
}

test('speed and independent duration bounds are fixed', () => {
  assert.equal(CAT_TRAVERSE_MS, 54000);
  assert.deepEqual([CAT_WALK_MIN_MS, CAT_WALK_MAX_MS], [5000, 15000]);
  assert.deepEqual([CAT_REST_MIN_MS, CAT_REST_MAX_MS], [10000, 15000]);
  const minimum = setup([0]);
  assert.equal(minimum.cycle.getSnapshot().remainingMs, 5000);
  minimum.clock.advance(5000);
  assert.equal(minimum.cycle.getSnapshot().remainingMs, 10000);
  const maximum = setup([1]);
  assert.equal(maximum.cycle.getSnapshot().remainingMs, 15000);
  maximum.clock.advance(15000);
  assert.equal(maximum.cycle.getSnapshot().remainingMs, 15000);
});

test('every entry samples its own duration and every walk also samples direction', () => {
  const fixture = setup([0, 0, 0.1, 0.2, 1, 0.3, 0.4, 0, 0.5, 0.6, 1, 0.9]);
  const { clock, cycle } = fixture;
  assert.equal(fixture.draws, 2);
  assert.equal(cycle.getSnapshot().remainingMs, 5000);
  assert.equal(cycle.getSnapshot().direction, 1); // Outward left at x=0 becomes inward right.
  clock.advance(5000);
  assert.equal(cycle.getSnapshot().state, 'eat');
  assert.equal(cycle.getSnapshot().remainingMs, 10500);
  assert.equal(fixture.draws, 3);
  clock.advance(10500);
  assert.equal(cycle.getSnapshot().state, 'walk');
  assert.equal(cycle.getSnapshot().remainingMs, 7000);
  assert.equal(cycle.getSnapshot().direction, 1);
  assert.equal(fixture.draws, 5);
  clock.advance(7000);
  assert.equal(cycle.getSnapshot().state, 'play');
  assert.equal(cycle.getSnapshot().remainingMs, 11500);
  assert.equal(fixture.draws, 6);
  clock.advance(11500);
  assert.equal(cycle.getSnapshot().state, 'walk');
  assert.equal(cycle.getSnapshot().remainingMs, 9000);
  assert.equal(cycle.getSnapshot().direction, -1);
  assert.equal(fixture.draws, 8);
  clock.advance(9000);
  assert.equal(cycle.getSnapshot().state, 'sleep');
  assert.equal(cycle.getSnapshot().remainingMs, 12500);
  assert.equal(fixture.draws, 9);
  clock.advance(12500);
  assert.equal(cycle.getSnapshot().state, 'walk');
  assert.equal(cycle.getSnapshot().remainingMs, 11000);
  assert.equal(cycle.getSnapshot().direction, 1);
  assert.equal(fixture.draws, 11);
  clock.advance(11000);
  assert.equal(cycle.getSnapshot().state, 'eat');
  assert.equal(cycle.getSnapshot().remainingMs, 14500);
  assert.equal(fixture.draws, 12);
});

test('two full cycles keep the order, current position, and one timer', () => {
  const { clock, cycle } = setup([0.5, 1]);
  const seen = [];
  cycle.subscribe(() => seen.push(cycle.getSnapshot().state));
  for (let round = 0; round < 2; round += 1) {
    for (const action of ['eat', 'play', 'sleep']) {
      const walk = cycle.getSnapshot();
      assert.equal(walk.state, 'walk');
      assert.ok(walk.remainingMs >= 5000 && walk.remainingMs <= 15000);
      assert.equal(clock.pending, 1);
      clock.advance(walk.remainingMs);
      const stopped = cycle.getSnapshot();
      assert.equal(stopped.state, action);
      assert.ok(stopped.position >= 0 && stopped.position <= 1);
      assert.equal(stopped.moving, false);
      assert.ok(stopped.remainingMs >= 10000 && stopped.remainingMs <= 15000);
      clock.advance(stopped.remainingMs - 1);
      closeTo(cycle.getSnapshot().position, stopped.position);
      clock.advance(1);
      assert.equal(cycle.getSnapshot().state, 'walk');
      closeTo(cycle.getSnapshot().position, stopped.position);
    }
  }
  assert.deepEqual(seen, ['eat', 'walk', 'play', 'walk', 'sleep', 'walk', 'eat', 'walk', 'play', 'walk', 'sleep', 'walk']);
  cycle.stop();
  assert.equal(clock.pending, 0);
});

test('direction choices are independent and near-edge choices point inward', () => {
  assert.equal(chooseWalkDirection(0.5, 0), -1);
  assert.equal(chooseWalkDirection(0.5, 1), 1);
  assert.equal(chooseWalkDirection(0, 0), 1);
  assert.equal(chooseWalkDirection(0.04, 0), 1);
  assert.equal(chooseWalkDirection(0.06, 0), -1);
  assert.equal(chooseWalkDirection(0.96, 1), -1);
  assert.equal(chooseWalkDirection(0.94, 1), 1);
  assert.equal(chooseWalkDirection(1, 1), -1);
  assert.equal(chooseWalkDirection(0.5, 0.5), 1);
});

test('boundary reflection keeps position and facing continuous', () => {
  const start = 0.9;
  const points = walkWaypoints(start, 1, 10000);
  assert.equal(points.length, 3);
  closeTo(points[0].position, start);
  closeTo(points[1].offset, 0.54);
  assert.equal(points[1].position, 1);
  const after = walkAfter(start, 1, 10000);
  closeTo(points[2].position, after.position);
  closeTo(after.position, 1 - 4600 / CAT_TRAVERSE_MS);
  assert.equal(after.direction, -1);
  const turns = walkFacingKeyframes(start, 1, 10000);
  assert.deepEqual(turns.map(({ direction }) => direction), [1, 1, -1, -1]);
  closeTo(turns[1].offset, 0.54);
  closeTo(turns[2].offset, 0.54);
  closeTo(walkAfter(1, 1, 1000).position, 1 - 1000 / CAT_TRAVERSE_MS);
  closeTo(walkAfter(0, -1, 1000).position, 1000 / CAT_TRAVERSE_MS);
});

test('celebration and background pause do not redraw time or direction', () => {
  const fixture = setup([0.5, 1]);
  const { clock, cycle } = fixture;
  assert.equal(fixture.draws, 2);
  const initial = cycle.getSnapshot();
  clock.advance(1000);
  cycle.celebrate();
  const frozen = cycle.getSnapshot();
  assert.equal(fixture.draws, 2);
  clock.advance(CAT_CELEBRATE_MS);
  assert.equal(cycle.getSnapshot().remainingMs, initial.remainingMs - 1000);
  closeTo(cycle.getSnapshot().position, frozen.position);
  assert.equal(cycle.getSnapshot().direction, frozen.direction);
  cycle.setMode({ enabled: true, visible: false, reduce: false });
  clock.advance(20000);
  cycle.setMode({ enabled: true, visible: true, reduce: false });
  assert.equal(fixture.draws, 2);
  assert.equal(cycle.getSnapshot().remainingMs, initial.remainingMs - 1000);
  clock.advance(initial.remainingMs - 1000);
  assert.equal(fixture.draws, 3);
  assert.equal(cycle.getSnapshot().state, 'eat');
});

for (const action of ['walk', 'eat', 'play', 'sleep']) {
  test(`celebration restores the remaining ${action} duration at its location`, () => {
    const { clock, cycle } = setup([0.75]);
    while (cycle.getSnapshot().state !== action || (action === 'walk' && cycle.getSnapshot().step !== 0)) {
      clock.advance(cycle.getSnapshot().remainingMs);
    }
    const length = cycle.getSnapshot().remainingMs;
    clock.advance(Math.floor(length / 2));
    cycle.celebrate();
    const frozen = cycle.getSnapshot();
    assert.equal(frozen.state, 'celebrate');
    assert.equal(frozen.moving, false);
    clock.advance(CAT_CELEBRATE_MS);
    assert.equal(cycle.getSnapshot().state, action);
    closeTo(cycle.getSnapshot().position, frozen.position);
    assert.equal(cycle.getSnapshot().remainingMs, length - Math.floor(length / 2));
    clock.advance(length - Math.floor(length / 2));
    assert.notEqual(cycle.getSnapshot().state, action);
  });
}

test('rapid successes queue only one extra celebration at the same position', () => {
  const { clock, cycle } = setup([0.75]);
  clock.advance(1000);
  for (let i = 0; i < 6; i += 1) cycle.celebrate();
  const frozen = cycle.getSnapshot().position;
  clock.advance(2000);
  assert.equal(cycle.getSnapshot().state, 'celebrate');
  closeTo(cycle.getSnapshot().position, frozen);
  clock.advance(2000);
  assert.equal(cycle.getSnapshot().state, 'walk');
  closeTo(cycle.getSnapshot().position, frozen);
});

test('hidden tab pauses and discards stale celebration', () => {
  const { clock, cycle } = setup([0.75]);
  clock.advance(2000);
  cycle.setMode({ enabled: true, visible: false, reduce: false });
  const frozen = cycle.getSnapshot();
  assert.equal(frozen.moving, false);
  assert.equal(clock.pending, 0);
  assert.equal(cycle.celebrate(), false);
  clock.advance(30000);
  cycle.setMode({ enabled: true, visible: true, reduce: false });
  closeTo(cycle.getSnapshot().position, frozen.position);
  clock.advance(frozen.remainingMs);
  assert.equal(cycle.getSnapshot().state, 'eat');
  cycle.celebrate();
  clock.advance(500);
  cycle.setMode({ enabled: true, visible: false, reduce: false });
  clock.advance(10000);
  cycle.setMode({ enabled: true, visible: true, reduce: false });
  assert.equal(cycle.getSnapshot().state, 'eat');
});

test('reduced motion is stationary and restores the interrupted walk', () => {
  const { clock, cycle } = setup([0.75]);
  const length = cycle.getSnapshot().remainingMs;
  clock.advance(1200);
  cycle.setMode({ enabled: true, visible: true, reduce: true });
  assert.equal(cycle.getSnapshot().state, 'sleep');
  assert.equal(cycle.getSnapshot().position, 0);
  assert.equal(clock.pending, 0);
  cycle.celebrate();
  assert.equal(cycle.getSnapshot().state, 'celebrate');
  assert.equal(cycle.getSnapshot().position, 0);
  clock.advance(CAT_CELEBRATE_MS);
  assert.equal(cycle.getSnapshot().state, 'sleep');
  cycle.setMode({ enabled: true, visible: true, reduce: false });
  closeTo(cycle.getSnapshot().position, 1200 / CAT_TRAVERSE_MS);
  assert.equal(cycle.getSnapshot().remainingMs, length - 1200);
});

test('hiding resets motion and selects a fresh walk on showing again', () => {
  const fixture = setup([0.75]);
  const { clock, cycle } = fixture;
  clock.advance(2000);
  cycle.celebrate();
  cycle.celebrate();
  cycle.setMode({ enabled: false, visible: true, reduce: false });
  assert.equal(clock.pending, 0);
  assert.equal(cycle.getSnapshot().remainingMs, 0);
  const before = fixture.draws;
  clock.advance(20000);
  cycle.setMode({ enabled: true, visible: true, reduce: false });
  assert.equal(fixture.draws, before + 2);
  assert.equal(cycle.getSnapshot().state, 'walk');
  assert.equal(cycle.getSnapshot().position, 0);
  assert.equal(cycle.getSnapshot().direction, 1);
});
