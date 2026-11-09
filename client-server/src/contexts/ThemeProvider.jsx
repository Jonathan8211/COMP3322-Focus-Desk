import { useCallback, useEffect, useRef, useState } from 'react';
import { ThemeContext } from './theme-context';
import { THEMES, PETS } from './appearance-options';

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
  const [theme, setThemeState] = useState(() => readChoice('focusdesk.theme', THEMES, 'luxe'));
  const [pet, setPetState] = useState(() => readChoice('focusdesk.pet', PETS, 'cat'));
  const [petVisible, setPetVisibleState] = useState(() => readChoice('focusdesk.petVisible', ['true', 'false'], 'true') === 'true');
  const [celebrating, setCelebrating] = useState(false);
  const timeout = useRef(null);

  useEffect(() => { document.documentElement.dataset.theme = theme; persist('focusdesk.theme', theme); }, [theme]);
  useEffect(() => { persist('focusdesk.pet', pet); }, [pet]);
  useEffect(() => { persist('focusdesk.petVisible', String(petVisible)); }, [petVisible]);
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);

  const setTheme = (value) => { if (THEMES.includes(value)) setThemeState(value); };
  const setPet = (value) => { if (PETS.includes(value)) setPetState(value); };
  const celebrate = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
    setCelebrating(true);
    timeout.current = setTimeout(() => { setCelebrating(false); timeout.current = null; }, 2000);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme, pet, setPet, petVisible, setPetVisible: setPetVisibleState, celebrating, celebrate }}>{children}</ThemeContext.Provider>;
}
