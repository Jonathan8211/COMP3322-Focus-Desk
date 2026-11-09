import { useTheme } from '../contexts/useTheme';

export default function PetDock() {
  const { pet, petVisible, celebrating } = useTheme();
  if (!petVisible) return null;
  return <div className="pet-dock mx-4 mt-4 flex items-center gap-3 rounded-2xl border px-4 py-2 md:mx-8" data-state={celebrating ? 'celebrate' : 'idle'}>
    <img src={`/pets/${pet}.svg`} alt={`${pet} companion`} width="56" height="56" className="pet-art shrink-0" />
    <div className="min-w-0"><p className="text-sm font-semibold">Your focus companion</p><p aria-live="polite" className="text-xs text-gray-600">{celebrating ? 'Great work! Task completed.' : 'One step at a time.'}</p></div>
    {celebrating && <span aria-hidden="true" className="pet-sparkle ml-auto text-xl">✦</span>}
  </div>;
}
