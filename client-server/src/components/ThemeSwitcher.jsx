import { useTheme } from '../contexts/useTheme';

export default function ThemeSwitcher({ id, className = '' }) {
  const { theme, setTheme } = useTheme();
  return <select id={id} aria-label="Theme" value={theme} onChange={(event) => setTheme(event.target.value)} className={`rounded-lg border px-2 py-2 text-sm ${className}`}>
    <option value="cute">Cute</option><option value="luxe">Luxe</option><option value="dark">Dark</option>
  </select>;
}
