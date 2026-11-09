import { useState } from 'react';
import { getMe, updateMe } from '../services/api';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { useTheme } from '../contexts/useTheme';
import { PETS } from '../contexts/appearance-options';

export default function Settings({ user, onUserUpdated }) {
  const { pet, setPet, petVisible, setPetVisible } = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [message, setMessage] = useState('');
  const save = async (event) => {
    event.preventDefault();
    const result = await updateMe({ name, timezone });
    if (result.success) {
      onUserUpdated?.(result.data);
      setMessage('Saved');
    } else setMessage(result.message || 'Could not save settings.');
  };
  const refresh = async () => {
    const result = await getMe();
    if (result.success) {
      setName(result.data.name);
      setTimezone(result.data.timezone);
      onUserUpdated?.(result.data);
      setMessage('Refreshed');
    } else setMessage(result.message || 'Could not refresh settings.');
  };
  return <section className="max-w-xl p-8 mx-auto"><h1 className="text-2xl font-bold">Settings</h1><p className="text-gray-500 mt-2">Manage your account.</p>
    <form onSubmit={save} className="bg-white border rounded-2xl p-5 mt-6 space-y-4">
      <label className="block text-sm">Name<input className="block border rounded-lg p-2 w-full mt-1" value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label className="block text-sm">Email<input className="block border rounded-lg p-2 w-full mt-1 bg-gray-50" value={user?.email || ''} disabled /><span className="text-xs text-gray-500">Used only as your sign-in name.</span></label>
      <label className="block text-sm">Time zone<input className="block border rounded-lg p-2 w-full mt-1" value={timezone} onChange={(event) => setTimezone(event.target.value)} required /><span className="text-xs text-gray-500">Use an IANA time zone, such as Asia/Shanghai.</span></label>
      <div className="flex gap-3"><button className="bg-indigo-600 text-white rounded-lg px-4 py-2">Save</button><button type="button" onClick={refresh} className="text-gray-600">Refresh</button></div>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
    <section aria-labelledby="appearance-heading" className="mt-6 space-y-4 rounded-2xl border bg-white p-5">
      <div><h2 id="appearance-heading" className="text-lg font-semibold">Appearance</h2><p className="mt-1 text-sm text-gray-600">Your choices are saved on this device.</p></div>
      <label className="block text-sm" htmlFor="settings-theme">Theme</label>
      <ThemeSwitcher id="settings-theme" className="w-full" />
      <label className="block text-sm" htmlFor="settings-pet">Focus companion</label>
      <select id="settings-pet" aria-label="Focus companion" value={pet} onChange={(event) => setPet(event.target.value)} className="w-full rounded-lg border p-2 capitalize">
        {PETS.map((name) => <option key={name} value={name}>{name[0].toUpperCase() + name.slice(1)}</option>)}
      </select>
      <div className="flex items-center gap-4 rounded-xl border p-3"><img src={`/pets/${pet}.svg`} alt={`${pet} preview`} width="72" height="72" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={petVisible} onChange={(event) => setPetVisible(event.target.checked)} />Show companion</label></div>
    </section>
  </section>;
}
