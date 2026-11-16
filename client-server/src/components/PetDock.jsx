import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/useTheme';
import { walkFacingKeyframes, walkWaypoints } from '../contexts/catCycle';

export default function PetDock() {
  const { theme, pet, petVisible, celebrating, petState, completionCount } = useTheme();
  const travelerRef = useRef(null);
  const facingRef = useRef(null);

  useEffect(() => {
    const traveler = travelerRef.current;
    const facing = facingRef.current;
    if (!petVisible || !petState.moving || !traveler || !facing) return;
    const frames = walkWaypoints(petState.position, petState.direction, petState.remainingMs)
      .map(({ offset, position }) => ({ offset, left: `calc((100% - var(--pet-width)) * ${position})` }));
    const turnFrames = walkFacingKeyframes(petState.position, petState.direction, petState.remainingMs)
      .map(({ offset, direction }) => ({ offset, transform: `scaleX(${direction})` }));
    const travel = traveler.animate(frames, { duration: petState.remainingMs, easing: 'linear', fill: 'forwards' });
    const turn = facing.animate(turnFrames, { duration: petState.remainingMs, easing: 'linear', fill: 'forwards' });
    return () => { travel.cancel(); turn.cancel(); };
  }, [pet, petVisible, petState.direction, petState.moving, petState.position, petState.remainingMs]);

  if (!petVisible) return null;

  const state = petState.state;
  const caption = <div className="min-w-0">
    <p className="text-sm font-semibold">Your focus companion</p>
    <p className="text-xs text-gray-600">{celebrating ? 'Great work! Task completed.' : 'One step at a time.'}</p>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{completionCount ? `${completionCount} task${completionCount === 1 ? '' : 's'} completed this visit.` : ''}</span>
  </div>;

  const walking = state === 'walk';
  const artwork = walking ? 'walk' : state;
  const darkVariant = pet === 'cat' && theme === 'dark' ? '-dark' : '';
  return <div className="pet-dock mx-4 mt-4 rounded-2xl border px-4 py-2 md:mx-8" data-pet={pet} data-state={state} data-paused={petState.paused}>
    <div className="pet-caption flex items-center justify-between gap-3">
      {caption}
      {celebrating && <span aria-hidden="true" className="pet-sparkle text-xl">✦</span>}
    </div>
    <div className="pet-track" aria-hidden="true">
      <div ref={travelerRef} className="pet-traveler" data-moving={petState.moving} style={{
        '--pet-position': petState.position,
      }}>
        <div ref={facingRef} className={petState.direction < 0 ? 'pet-facing pet-facing-left' : 'pet-facing'}>
          <div className="pet-pose">
            {pet === 'goose' && state === 'play' && <span className="goose-pond" />}
            <img src={`/pets/${pet}-${artwork}${darkVariant}.svg`} alt="" width="96" height="72" className="pet-art" />
            {walking && <img src={`/pets/${pet}-walk-step${darkVariant}.svg`} alt="" width="96" height="72" className="pet-art pet-walk-step" />}
            {pet === 'cat' && state === 'play' && <span className="cat-toy" />}
          </div>
        </div>
      </div>
    </div>
  </div>;
}
