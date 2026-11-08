import { useCallback, useEffect, useRef, useState } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { FileText, Plus, X } from 'lucide-react';
import Editor from '../components/Editor';
import { createNote, deleteNote, getNotes, updateNote } from '../services/api';

const EMOJIS = ['📄', '📝', '💡', '🎯', '📚'];
const fields = (note) => ({ title: note.title, emoji: note.emoji, content: note.content });
const sameDraft = (a, b) => a && b && a.title === b.title && a.emoji === b.emoji && a.content === b.content;

export default function NotionPages({ onDirtyChange }) {
  const [pages, setPages] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState(null);
  const latestDraft = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [savingIds, setSavingIds] = useState([]);
  const [status, setStatus] = useState('saved');
  const [error, setError] = useState('');
  const listRequest = useRef(0);
  const viewVersion = useRef(0);
  const editVersion = useRef(0);
  const pendingSaves = useRef(new Map());
  const active = pages.find((page) => page.id === activeId);
  const dirty = Boolean(active && draft && !sameDraft(fields(active), draft));
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useBeforeUnload(useCallback((event) => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  }, [dirty]));

  const loadNotes = useCallback(async () => {
    const request = ++listRequest.current;
    const result = await getNotes();
    if (request !== listRequest.current) return;
    if (result.success) {
      const first = result.data[0] || null;
      viewVersion.current += 1;
      setPages(result.data);
      setActiveId(first?.id ?? null);
      latestDraft.current = first ? fields(first) : null;
      setDraft(latestDraft.current);
      setStatus('saved');
      setLoadFailed(false);
    } else {
      setLoadFailed(true);
      setError(result.message || 'Could not load notes. Please retry.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadNotes);
    return () => { listRequest.current += 1; };
  }, [loadNotes]);

  const edit = (changes) => {
    editVersion.current += 1;
    const next = { ...latestDraft.current, ...changes };
    latestDraft.current = next;
    setDraft(next);
    setStatus('unsaved');
    setError('');
  };

  const choose = async (page) => {
    if (page.id === activeId) return;
    if (dirty && !window.confirm('This note has unsaved changes. Discard them and switch notes?')) return;
    const view = ++viewVersion.current;
    setActiveId(page.id);
    const pending = pendingSaves.current.get(page.id);
    if (pending) {
      latestDraft.current = null;
      setDraft(null);
      setStatus('saving');
      setError('');
      const result = await pending.promise;
      if (view !== viewVersion.current) return;
      const next = result.success ? fields(result.data) : pending.payload;
      latestDraft.current = next;
      setDraft(next);
      setStatus(result.success ? 'saved' : 'failed');
      if (!result.success) setError(result.message || 'Could not save this note. Your text is still here.');
      return;
    }
    const next = fields(page);
    latestDraft.current = next;
    setDraft(next);
    setStatus('saved');
    setError('');
  };

  const add = async () => {
    if (loading || loadFailed || creating || deletingId !== null) return;
    if (dirty && !window.confirm('This note has unsaved changes. Discard them and create another note?')) return;
    const view = viewVersion.current;
    const edit = editVersion.current;
    setCreating(true);
    const result = await createNote({ title: 'Untitled', emoji: '📄', content: '' });
    setCreating(false);
    if (!result.success) {
      if (view === viewVersion.current) setError(result.message || 'Could not create note. Please retry.');
      return;
    }
    setPages((current) => [result.data, ...current]);
    if (view !== viewVersion.current || edit !== editVersion.current) return;
    viewVersion.current += 1;
    setActiveId(result.data.id);
    latestDraft.current = fields(result.data);
    setDraft(fields(result.data));
    setStatus('saved');
    setError('');
  };

  const save = async () => {
    if (!active || !draft || !dirty || status === 'saving') return;
    const view = viewVersion.current;
    const noteId = active.id;
    const payload = { ...latestDraft.current };
    setStatus('saving');
    setError('');
    const pending = { promise: updateNote(noteId, payload), payload };
    pendingSaves.current.set(noteId, pending);
    setSavingIds((current) => [...current, noteId]);
    const result = await pending.promise;
    if (pendingSaves.current.get(noteId) === pending) pendingSaves.current.delete(noteId);
    setSavingIds((current) => current.filter((id) => id !== noteId));
    if (!result.success) {
      if (view === viewVersion.current) {
        setStatus('failed');
        setError(result.message || 'Could not save note. Your text is still here.');
      }
      return;
    }
    setPages((current) => current.map((page) => page.id === noteId ? result.data : page));
    if (view !== viewVersion.current) return;
    if (sameDraft(latestDraft.current, payload)) {
      const saved = fields(result.data);
      latestDraft.current = saved;
      setDraft(saved);
      setStatus('saved');
    } else setStatus('unsaved');
  };

  const remove = async (page) => {
    if (deletingId !== null || creating || status === 'saving' || pendingSaves.current.has(page.id)) return;
    if (page.id === activeId && dirty && !window.confirm('Discard unsaved changes and delete this note?')) return;
    const view = viewVersion.current;
    setDeletingId(page.id);
    const result = await deleteNote(page.id);
    setDeletingId(null);
    if (!result.success) {
      if (view === viewVersion.current) setError(result.message || 'Could not delete note. Please retry.');
      return;
    }
    const remaining = pages.filter((item) => item.id !== page.id);
    setPages(remaining);
    if (view === viewVersion.current && activeId === page.id) {
      const first = remaining[0] || null;
      viewVersion.current += 1;
      setActiveId(first?.id ?? null);
      latestDraft.current = first ? fields(first) : null;
      setDraft(latestDraft.current);
      setStatus('saved');
    }
    setError('');
  };

  return <div className="flex min-h-screen min-w-0 flex-col md:flex-row">
    <aside className="w-full border-b border-gray-200 bg-gray-50 p-3 md:w-56 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-2 py-2"><h2 className="text-sm font-semibold text-gray-600">Notes</h2><button onClick={add} disabled={loading || loadFailed || creating || deletingId !== null} aria-label="New page" className="rounded p-1 text-indigo-600 disabled:opacity-50"><Plus size={18} /></button></div>
      {loading ? <p role="status" className="px-2 text-sm text-gray-500">Loading notes…</p> : pages.length === 0 ? <p className="px-2 text-sm text-gray-500">No notes yet.</p> : <ul className="space-y-1">
        {pages.map((page) => <li key={page.id} className="flex items-center gap-1 rounded-lg hover:bg-white">
          <button type="button" onClick={() => choose(page)} aria-current={activeId === page.id ? 'page' : undefined} className="min-w-0 flex-1 truncate px-2 py-2 text-left text-sm">{page.emoji} {page.id === activeId ? draft?.title ?? page.title : page.title}</button>
          <button type="button" onClick={() => remove(page)} disabled={deletingId !== null || creating || status === 'saving' || savingIds.includes(page.id)} aria-label={`Delete ${page.title}`} className="p-2 text-gray-500 hover:text-red-600 disabled:opacity-50"><X size={15} /></button>
        </li>)}
      </ul>}
    </aside>
    <section className="min-w-0 flex-1 p-4 md:p-8">
      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {loadFailed && <button onClick={() => { setLoading(true); setError(''); loadNotes(); }} disabled={loading} className="mb-4 rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Retry loading notes</button>}
      {!active || !draft ? <div className="grid min-h-64 place-items-center text-center text-gray-500"><div><FileText className="mx-auto mb-3" /><p>{active && status === 'saving' ? 'Waiting for this note to finish saving…' : 'Select a note or create one.'}</p>{!active && !loadFailed && !loading && <button onClick={add} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">New Page</button>}</div></div> : <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span aria-label="Save status" className={`text-sm ${status === 'failed' ? 'text-red-600' : 'text-gray-500'}`}>{({ saved: 'Saved', unsaved: 'Unsaved', saving: 'Saving…', failed: 'Save failed' })[status]}</span>
          <button onClick={save} disabled={!dirty || status === 'saving' || deletingId === activeId} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">Save</button>
        </div>
        <button type="button" onClick={() => edit({ emoji: EMOJIS[(EMOJIS.indexOf(draft.emoji) + 1) % EMOJIS.length] })} aria-label="Change note icon" className="mt-6 text-4xl">{draft.emoji}</button>
        <input aria-label="Note title" value={draft.title} maxLength={255} onChange={(event) => edit({ title: event.target.value })} className="mt-4 w-full border-b bg-transparent pb-2 text-3xl font-semibold outline-none" />
        <div className="mt-6"><Editor key={active.id} content={draft.content} onChange={(html) => edit({ content: html })} placeholder="Start typing your note…" /></div>
      </div>}
    </section>
    {blocker.state === 'blocked' && <div role="dialog" aria-modal="true" aria-labelledby="unsaved-note-title" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h2 id="unsaved-note-title" className="text-lg font-semibold">Leave without saving?</h2>
      <p className="mt-2 text-sm text-gray-600">Your note has unsaved changes.</p>
      <div className="mt-5 flex justify-end gap-3"><button onClick={() => blocker.reset()} className="rounded-lg border px-4 py-2 text-sm">Keep editing</button><button onClick={() => blocker.proceed()} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white">Discard changes</button></div>
    </div></div>}
  </div>;
}
