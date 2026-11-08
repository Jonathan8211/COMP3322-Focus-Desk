import { useCallback, useEffect, useState } from 'react';
import { createChecklistItem, deleteChecklistItem, getChecklistItems, updateChecklistItem } from '../services/api';

export default function Checklist({ taskId, onChanged }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ done: 0, total: 0 });
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const result = await getChecklistItems(taskId);
    if (result.success) {
      setItems(result.data);
      setSummary(result.summary);
      setError('');
    } else setError(result.message || 'Could not load checklist.');
    setLoading(false);
    return result.success;
  }, [taskId]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) load(); });
    return () => { active = false; };
  }, [load]);

  const mutate = async (action, onSuccess) => {
    setSaving(true);
    setError('');
    try {
      const result = await action();
      if (!result.success) { setError(result.message || 'Could not save checklist item.'); return; }
      const refreshed = await load();
      if (refreshed) {
        onSuccess?.();
        await onChanged?.();
      }
    } finally { setSaving(false); }
  };

  const add = async (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) { setError('Enter an item title.'); return; }
    await mutate(() => createChecklistItem(taskId, trimmed), () => setTitle(''));
  };
  const toggle = (item) => mutate(() => updateChecklistItem(taskId, item.id, { is_done: !item.is_done }));
  const saveEdit = async (event) => {
    event.preventDefault();
    const trimmed = editTitle.trim();
    if (!trimmed) { setError('Enter an item title.'); return; }
    await mutate(() => updateChecklistItem(taskId, editingId, { title: trimmed }), () => setEditingId(null));
  };
  const remove = (item) => mutate(() => deleteChecklistItem(taskId, item.id));

  return <section aria-labelledby="checklist-heading" className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
    <div className="flex items-center justify-between gap-3">
      <h2 id="checklist-heading" className="text-xl font-semibold text-gray-900">Checklist</h2>
      {summary.total > 0 && <span className="text-sm text-gray-600" aria-label={`${summary.done} of ${summary.total} checklist items complete`}>{summary.done}/{summary.total} done</span>}
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    {loading ? <p role="status" className="mt-4 text-sm text-gray-500">Loading checklist…</p> : <>
      {items.length === 0 && <p className="mt-4 text-sm text-gray-500">No checklist items yet.</p>}
      <ul className="mt-4 space-y-3">
        {items.map((item) => <li key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
          <input type="checkbox" aria-label={`Complete ${item.title}`} checked={item.is_done} disabled={saving} onChange={() => toggle(item)} />
          {editingId === item.id ? <form onSubmit={saveEdit} className="flex min-w-0 flex-1 flex-wrap gap-2">
            <input aria-label={`Edit ${item.title}`} autoFocus value={editTitle} maxLength={255} onChange={(event) => setEditTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setEditingId(null); }} className="min-w-32 flex-1 rounded-lg border px-3 py-1.5" />
            <button disabled={saving} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">Save</button>
            <button type="button" disabled={saving} onClick={() => setEditingId(null)} className="text-sm text-gray-600">Cancel</button>
          </form> : <>
            <span className={`min-w-0 flex-1 break-words text-sm ${item.is_done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.title}</span>
            <button type="button" disabled={saving} onClick={() => { setEditingId(item.id); setEditTitle(item.title); }} className="text-sm text-indigo-600 disabled:opacity-50" aria-label={`Rename ${item.title}`}>Edit</button>
            <button type="button" disabled={saving} onClick={() => remove(item)} className="text-sm text-red-600 disabled:opacity-50" aria-label={`Delete ${item.title}`}>Delete</button>
          </>}
        </li>)}
      </ul>
      <form onSubmit={add} className="mt-5 flex flex-wrap gap-2">
        <input aria-label="New checklist item" value={title} maxLength={255} disabled={saving} onChange={(event) => setTitle(event.target.value)} placeholder="Add a checklist item" className="min-w-40 flex-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-50" />
        <button disabled={saving || !title.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Saving…' : 'Add item'}</button>
      </form>
      {saving && <p role="status" className="mt-3 text-sm text-gray-500">Saving checklist…</p>}
    </>}
  </section>;
}
