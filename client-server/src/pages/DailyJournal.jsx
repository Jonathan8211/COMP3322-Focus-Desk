import { useCallback, useEffect, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { dateOnly, todayDateOnly } from '../utils/dateOnly';
import { deleteDailyEntry, getDailyEntries, getDailyEntry, saveDailyEntry } from '../services/api';

const blank = { journal_text: '', reflection_text: '' };
const sameText = (a, b) => a.journal_text === b.journal_text && a.reflection_text === b.reflection_text;

export default function DailyJournal({ timezone = 'UTC', tasks = [], onDirtyChange }) {
  const [today, setToday] = useState(() => todayDateOnly(timezone));
  const [openedToday, setOpenedToday] = useState(() => todayDateOnly(timezone));
  const [selectedDate, setSelectedDate] = useState(() => todayDateOnly(timezone));
  const [loadedDate, setLoadedDate] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState(blank);
  const latestDraft = useRef(blank);
  const [saved, setSaved] = useState(blank);
  const [exists, setExists] = useState(false);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('saved');
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const requestId = useRef(0);
  const historyRequestId = useRef(0);
  const viewVersion = useRef(0);
  const pendingMutations = useRef(new Map());
  const dirty = !sameText(draft, saved);
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useBeforeUnload(useCallback((event) => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  }, [dirty]));

  const loadHistory = useCallback(async (day) => {
    const request = ++historyRequestId.current;
    const from = DateTime.fromISO(day).minus({ days: 365 }).toISODate();
    const result = await getDailyEntries(from, day);
    if (request !== historyRequestId.current) return;
    if (result.success) { setHistory(result.data); setHistoryError(''); }
    else { setHistory([]); setHistoryError(result.message || 'Could not load journal history. Please retry.'); }
  }, []);

  useEffect(() => {
    const refreshToday = () => setToday(todayDateOnly(timezone));
    const timer = window.setInterval(refreshToday, 60000);
    return () => window.clearInterval(timer);
  }, [timezone]);

  useEffect(() => {
    let active = true;
    const currentRequest = ++requestId.current;
    const currentView = viewVersion.current;
    const pending = pendingMutations.current.get(selectedDate);
    const request = pending ? pending.then(() => getDailyEntry(selectedDate)) : getDailyEntry(selectedDate);
    request.then((result) => {
      if (!active || currentRequest !== requestId.current || currentView !== viewVersion.current) return;
      if (result.success || result.status === 404) {
        const next = result.success ? {
          journal_text: result.data.journal_text,
          reflection_text: result.data.reflection_text,
        } : { ...blank };
        latestDraft.current = next;
        setDraft(next);
        setSaved(next);
        setExists(result.success);
        setStatus('saved');
        setError('');
        setLoadedDate(selectedDate);
      } else {
        setLoadFailed(true);
        setError(result.message || 'Could not load this date. Please retry.');
        setStatus('failed');
      }
    });
    return () => { active = false; requestId.current += 1; };
  }, [selectedDate, loadAttempt]);

  useEffect(() => { Promise.resolve().then(() => loadHistory(today)); }, [today, loadHistory]);

  const selectDate = (next) => {
    if (!next) return false;
    if (next === selectedDate) return true;
    if (dirty && !window.confirm('This journal entry has unsaved changes. Discard them and switch dates?')) return false;
    viewVersion.current += 1;
    requestId.current += 1;
    setSelectedDate(next);
    setLoadedDate(null);
    setLoadFailed(false);
    latestDraft.current = { ...blank };
    setDraft(latestDraft.current);
    setSaved(latestDraft.current);
    setExists(false);
    setStatus('saved');
    setError('');
    return true;
  };

  const edit = (field, value) => {
    const next = { ...latestDraft.current, [field]: value };
    latestDraft.current = next;
    setDraft(next);
    setStatus('unsaved');
    setError('');
  };

  const save = async () => {
    if (status === 'saving' || loadedDate !== selectedDate) return;
    const view = viewVersion.current;
    const date = selectedDate;
    if (!latestDraft.current.journal_text.trim() && !latestDraft.current.reflection_text.trim()) {
      setStatus('failed');
      setError('Write in at least one field before saving.');
      return;
    }
    const payload = { ...latestDraft.current };
    setStatus('saving');
    setError('');
    const pending = saveDailyEntry(date, payload);
    pendingMutations.current.set(date, pending);
    const result = await pending;
    if (pendingMutations.current.get(date) === pending) pendingMutations.current.delete(date);
    if (view !== viewVersion.current) {
      if (result.success) await loadHistory(today);
      return;
    }
    if (!result.success) {
      setStatus('failed');
      setError(result.message || 'Could not save. Your text is still here.');
      return;
    }
    setExists(true);
    setSaved({ journal_text: result.data.journal_text, reflection_text: result.data.reflection_text });
    setStatus(sameText(latestDraft.current, payload) ? 'saved' : 'unsaved');
    await loadHistory(today);
  };

  const remove = async () => {
    if (!exists || status === 'saving') return;
    if (dirty && !window.confirm('Discard unsaved changes and delete this date?')) return;
    const view = viewVersion.current;
    const date = selectedDate;
    setStatus('saving');
    const pending = deleteDailyEntry(date);
    pendingMutations.current.set(date, pending);
    const result = await pending;
    if (pendingMutations.current.get(date) === pending) pendingMutations.current.delete(date);
    if (view !== viewVersion.current) {
      if (result.success) await loadHistory(today);
      return;
    }
    if (!result.success) { setStatus('failed'); setError(result.message || 'Could not delete entry.'); return; }
    latestDraft.current = blank;
    setDraft(blank);
    setSaved(blank);
    setExists(false);
    setStatus('saved');
    setError('');
    await loadHistory(today);
  };

  const dueTasks = tasks.filter((task) => dateOnly(task.due_date) === selectedDate);
  return <div className="mx-auto max-w-4xl p-4 md:p-8">
    <h1 className="text-3xl font-semibold text-gray-900">Daily Journal</h1>
    <p className="mt-1 text-sm text-gray-500">Write about your day and reflect on what helped.</p>
    {today !== openedToday && <div role="status" className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm">A new local day has started. Your selected date has stayed the same. <button onClick={() => { if (selectDate(today)) setOpenedToday(today); }} className="font-semibold text-indigo-700 underline">Open today</button></div>}
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <label className="text-sm font-medium" htmlFor="journal-date">Date</label>
      <input id="journal-date" type="date" value={selectedDate} onChange={(event) => selectDate(event.target.value)} className="rounded-lg border px-3 py-2" />
      <button onClick={() => { if (selectDate(today)) setOpenedToday(today); }} className="rounded-lg border px-3 py-2 text-sm">Today</button>
      <span aria-label="Save status" className={`text-sm ${status === 'failed' ? 'text-red-600' : 'text-gray-500'}`}>{({ saved: 'Saved', unsaved: 'Unsaved', saving: 'Saving…', failed: 'Save failed' })[status]}</span>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    {loadFailed ? <div className="mt-6"><p className="text-sm text-gray-600">This date could not be loaded. Editing is paused so another date’s text cannot be saved here.</p><button onClick={() => { setLoadFailed(false); setError(''); setLoadAttempt((value) => value + 1); }} className="mt-3 rounded-lg border px-4 py-2 text-sm">Retry loading date</button></div> : loadedDate !== selectedDate ? <p role="status" className="mt-6 text-gray-500">Loading this date…</p> : <>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-medium">Journal
          <textarea aria-label="Journal text" value={draft.journal_text} maxLength={20000} onChange={(event) => edit('journal_text', event.target.value)} className="mt-2 min-h-56 w-full rounded-xl border bg-white p-3 font-normal" placeholder="What happened today?" />
        </label>
        <label className="block text-sm font-medium">Reflection
          <textarea aria-label="Reflection text" value={draft.reflection_text} maxLength={20000} onChange={(event) => edit('reflection_text', event.target.value)} className="mt-2 min-h-56 w-full rounded-xl border bg-white p-3 font-normal" placeholder="What did you learn or notice?" />
        </label>
      </div>
      <div className="mt-4 flex gap-3"><button onClick={save} disabled={status === 'saving' || !dirty} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">Save</button>{exists && <button onClick={remove} disabled={status === 'saving'} className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600">Delete entry</button>}</div>
    </>}
    <section className="mt-8 rounded-2xl border bg-white p-5"><h2 className="text-lg font-semibold">Tasks due on this date</h2><p className="mt-1 text-sm text-gray-500">{dueTasks.length} tasks</p>{dueTasks.length > 0 && <ul className="mt-3 space-y-2 text-sm">{dueTasks.map((task) => <li key={task.id} className="flex gap-3"><span className={task.status === 'completed' ? 'text-emerald-600' : 'text-gray-700'}>{task.status === 'completed' ? 'Done' : 'Open'}</span><span>{task.title}</span></li>)}</ul>}</section>
    <section className="mt-8"><h2 className="text-lg font-semibold">History</h2><p className="text-sm text-gray-500">Past 366 local dates</p>{historyError && <div className="mt-2"><p role="alert" className="text-sm text-red-600">{historyError}</p><button onClick={() => loadHistory(today)} className="mt-2 rounded-lg border px-3 py-2 text-sm">Retry history</button></div>}{!historyError && (history.length === 0 ? <p className="mt-3 text-sm text-gray-500">No saved entries in this range.</p> : <ul className="mt-3 space-y-2">{history.map((entry) => <li key={entry.id}><button onClick={() => selectDate(entry.local_date)} className="w-full rounded-lg border bg-white px-4 py-3 text-left text-sm hover:border-indigo-300"><span className="font-medium">{entry.local_date}</span><span className="ml-3 text-gray-500">{entry.journal_text.slice(0, 60) || entry.reflection_text.slice(0, 60)}</span></button></li>)}</ul>)}</section>
    {blocker.state === 'blocked' && <div role="dialog" aria-modal="true" aria-labelledby="unsaved-journal-title" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 id="unsaved-journal-title" className="text-lg font-semibold">Leave without saving?</h2><p className="mt-2 text-sm text-gray-600">Your journal text has unsaved changes.</p><div className="mt-5 flex justify-end gap-3"><button onClick={() => blocker.reset()} className="rounded-lg border px-4 py-2 text-sm">Keep editing</button><button onClick={() => blocker.proceed()} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white">Discard changes</button></div></div></div>}
  </div>;
}
