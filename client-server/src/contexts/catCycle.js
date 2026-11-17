export const CAT_TRAVERSE_MS = 54000;
export const CAT_WALK_MIN_MS = 5000;
export const CAT_WALK_MAX_MS = 15000;
export const CAT_REST_MIN_MS = 10000;
export const CAT_REST_MAX_MS = 15000;
export const CAT_CELEBRATE_MS = 2000;
const BACKGROUND_CELEBRATION_MAX_AGE_MS = 10000;
const NEAR_EDGE = 0.05;
const sequence = ['walk', 'eat', 'walk', 'play', 'walk', 'sleep'];

export function chooseWalkDirection(position, randomValue) {
  const chosen = randomValue < 0.5 ? -1 : 1;
  if (position <= NEAR_EDGE && chosen < 0) return 1;
  if (position >= 1 - NEAR_EDGE && chosen > 0) return -1;
  return chosen;
}

export function walkAfter(position, direction, elapsedMs) {
  const start = direction > 0 ? position : 2 - position;
  const reflected = (start + Math.max(0, elapsedMs) / CAT_TRAVERSE_MS) % 2;
  return {
    position: reflected <= 1 ? reflected : 2 - reflected,
    direction: reflected < 1 ? 1 : -1,
  };
}

export function walkWaypoints(position, direction, durationMs) {
  const points = [{ offset: 0, position }];
  let currentPosition = position;
  let heading = direction;
  let elapsed = 0;
  while (elapsed < durationMs) {
    const toEdge = (heading > 0 ? 1 - currentPosition : currentPosition) * CAT_TRAVERSE_MS;
    if (toEdge < 0.000001) { heading = -heading; continue; }
    if (elapsed + toEdge >= durationMs) break;
    elapsed += toEdge;
    currentPosition = heading > 0 ? 1 : 0;
    points.push({ offset: elapsed / durationMs, position: currentPosition });
    heading = -heading;
  }
  points.push({ offset: 1, position: walkAfter(position, direction, durationMs).position });
  return points;
}

export function walkFacingKeyframes(position, direction, durationMs) {
  const points = walkWaypoints(position, direction, durationMs);
  let facing = walkAfter(position, direction, 0).direction;
  const frames = [{ offset: 0, direction: facing }];
  for (const point of points.slice(1, -1)) {
    frames.push({ offset: point.offset, direction: facing });
    facing = -facing;
    frames.push({ offset: point.offset, direction: facing });
  }
  frames.push({ offset: 1, direction: walkAfter(position, direction, durationMs).direction });
  return frames;
}

export function createCatCycle({ now = () => performance.now(), schedule = setTimeout, cancel = clearTimeout, random = Math.random } = {}) {
  const sampleDuration = (currentPhase) => {
    const min = currentPhase === 'walk' ? CAT_WALK_MIN_MS : CAT_REST_MIN_MS;
    const max = currentPhase === 'walk' ? CAT_WALK_MAX_MS : CAT_REST_MAX_MS;
    return min + Math.round(Math.min(1, Math.max(0, random())) * (max - min));
  };
  let active = false;
  let pageVisible = true;
  let reducedMotion = false;
  let moodPaused = false;
  let step = 0;
  let phase = sequence[step];
  let state = phase;
  let position = 0;
  let direction = 1;
  let phaseRemaining = 0;
  let celebrationRemaining = CAT_CELEBRATE_MS;
  let queuedCelebration = false;
  let hiddenAt = null;
  let timer = null;
  let startedAt = null;
  const listeners = new Set();
  let snapshot = { state: phase, phase, step, position, direction, remainingMs: phaseRemaining, moving: false, paused: true, reducedMotion: false };

  const publish = () => {
    snapshot = {
      state: active && reducedMotion && state !== 'celebrate' ? 'sleep' : state,
      phase,
      step,
      position: reducedMotion ? 0 : position,
      direction,
      remainingMs: phaseRemaining,
      moving: active && pageVisible && !reducedMotion && !moodPaused && state === 'walk',
      paused: !active || !pageVisible,
      reducedMotion,
    };
    listeners.forEach((listener) => listener());
  };

  const stopClock = () => {
    if (timer === null) return;
    const remaining = state === 'celebrate' ? celebrationRemaining : phaseRemaining;
    const elapsed = Math.min(remaining, Math.max(0, now() - startedAt));
    if (state === 'celebrate') celebrationRemaining -= elapsed;
    else {
      if (phase === 'walk') ({ position, direction } = walkAfter(position, direction, elapsed));
      phaseRemaining -= elapsed;
    }
    cancel(timer);
    timer = null;
    startedAt = null;
  };

  const startClock = () => {
    if (!active || !pageVisible || timer !== null || (moodPaused && state !== 'celebrate') || (reducedMotion && state !== 'celebrate')) return;
    startedAt = now();
    timer = schedule(advance, state === 'celebrate' ? celebrationRemaining : phaseRemaining);
  };

  const enterStep = (nextStep) => {
    step = nextStep;
    phase = sequence[step];
    state = phase;
    phaseRemaining = sampleDuration(phase);
    if (phase === 'walk') direction = chooseWalkDirection(position, random());
  };

  function advance() {
    stopClock();
    if (state === 'celebrate') {
      if (queuedCelebration) {
        queuedCelebration = false;
        celebrationRemaining = CAT_CELEBRATE_MS;
      } else {
        state = phase;
        celebrationRemaining = CAT_CELEBRATE_MS;
      }
    } else {
      enterStep((step + 1) % sequence.length);
    }
    publish();
    startClock();
  }

  const reset = () => {
    stopClock();
    step = 0;
    phase = sequence[step];
    state = phase;
    position = 0;
    direction = 1;
    phaseRemaining = 0;
    celebrationRemaining = CAT_CELEBRATE_MS;
    queuedCelebration = false;
    hiddenAt = null;
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    setMode({ enabled, visible, reduce }) {
      if (active === enabled && pageVisible === visible && reducedMotion === reduce) return;
      stopClock();
      if (!enabled) reset();
      else if (!active) enterStep(0);
      if (enabled && active && pageVisible && !visible) hiddenAt = now();
      if (enabled && !pageVisible && visible && hiddenAt !== null) {
        if (state === 'celebrate' && now() - hiddenAt >= BACKGROUND_CELEBRATION_MAX_AGE_MS) {
          state = phase;
          celebrationRemaining = CAT_CELEBRATE_MS;
          queuedCelebration = false;
        }
        hiddenAt = null;
      }
      active = enabled;
      pageVisible = visible;
      reducedMotion = reduce;
      publish();
      startClock();
    },
    celebrate() {
      if (!active || !pageVisible) return false;
      if (state === 'celebrate') {
        queuedCelebration = true;
        return true;
      }
      stopClock();
      state = 'celebrate';
      celebrationRemaining = CAT_CELEBRATE_MS;
      publish();
      startClock();
      return true;
    },
    setMoodPaused(value) {
      if (moodPaused === value) return;
      stopClock();
      moodPaused = value;
      publish();
      startClock();
    },
    stop() { reset(); active = false; publish(); },
  };
}
