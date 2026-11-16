import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ThemeContext } from './theme-context';
import { THEMES, PETS } from './appearance-options';
import { useAuth } from './useAuth';
import { createCatCycle } from './catCycle';

function readChoice(key, allowed, fallback) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch { return fallback; }
}

function persist(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Appearance remains usable for this visit. */ }
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState(() => readChoice('focusdesk.theme', THEMES, 'luxe'));
  const [pet, setPetState] = useState(() => readChoice('focusdesk.pet', PETS, 'cat'));
  const [petVisible, setPetVisibleState] = useState(() => readChoice('focusdesk.petVisible', ['true', 'false'], 'true') === 'true');
  const [completionState, setCompletionState] = useState({ userId: null, count: 0 });
  const [petCycle] = useState(createCatCycle);
  const petState = useSyncExternalStore(petCycle.subscribe, petCycle.getSnapshot);
  const userId = user?.id;
  const completionCount = completionState.userId === userId ? completionState.count : 0;

  useEffect(() => { document.documentElement.dataset.theme = theme; persist('focusdesk.theme', theme); }, [theme]);
  useEffect(() => { persist('focusdesk.pet', pet); }, [pet]);
  useEffect(() => { persist('focusdesk.petVisible', String(petVisible)); }, [petVisible]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => petCycle.setMode({
      enabled: Boolean(userId) && petVisible,
      visible: document.visibilityState === 'visible',
      reduce: media.matches,
    });
    update();
    document.addEventListener('visibilitychange', update);
    media.addEventListener('change', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      media.removeEventListener('change', update);
      petCycle.setMode({ enabled: false, visible: true, reduce: media.matches });
    };
  }, [petCycle, pet, petVisible, userId]);

  const setTheme = (value) => { if (THEMES.includes(value)) setThemeState(value); };
  const setPet = (value) => {
    if (PETS.includes(value) && value !== pet) setPetState(value);
  };
  const setPetVisible = setPetVisibleState;
  const celebrate = useCallback(() => {
    if (!petVisible || !userId) return;
    setCompletionState((current) => ({ userId, count: (current.userId === userId ? current.count : 0) + 1 }));
    petCycle.celebrate();
  }, [petCycle, petVisible, userId]);

  const celebrating = petVisible && Boolean(userId) && petState.state === 'celebrate';

  return <ThemeContext.Provider value={{ theme, setTheme, pet, setPet, petVisible, setPetVisible, celebrating, celebrate, petState, completionCount }}>{children}</ThemeContext.Provider>;
}
