import { useCallback, useEffect, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { useBeforeUnload, useBlocker, useSearchParams } from 'react-router-dom';
import { dateOnly, todayDateOnly } from '../utils/dateOnly';
import { deleteDailyEntry, getDailyEntries, getDailyEntry, saveDailyEntry, getDailyMood, analyzeDailyMood, deleteDailyMood } from '../services/api';
import { useTasks } from '../contexts/useTasks';
import { useTheme } from '../contexts/useTheme';

const blank = { journal_text: '', reflection_text: '' };
const sameText = (a, b) => a.journal_text === b.journal_text && a.reflection_text === b.reflection_text;
const validLocalDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && DateTime.fromISO(value, { zone: 'UTC' }).toISODate() === value;
const historyStart = (end) => DateTime.fromISO(end).minus({ days: 365 }).toISODate();
const moodFeeling = {
  difficult: 'Feeling overwhelmed',
  low: 'Feeling low',
  balanced: 'Feeling steady',
  positive: 'Feeling hopeful',
  joyful: 'Feeling delighted',
};

export default function DailyJournal({ timezone = 'UTC', onDirtyChange }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedDate = searchParams.get('date');
  const initialDate = validLocalDate(requestedDate) ? requestedDate : todayDateOnly(timezone);
  const { tasks } = useTasks();
  const { playMoodResponse, clearMoodResponse } = useTheme();
  const [today, setToday] = useState(() => todayDateOnly(timezone));
  const [openedToday, setOpenedToday] = useState(() => todayDateOnly(timezone));
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [historyEnd, setHistoryEnd] = useState(() => initialDate < todayDateOnly(timezone) ? initialDate : todayDateOnly(timezone));
  const [loadedDate, setLoadedDate] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState(blank);
  const latestDraft = useRef(blank);
  const [saved, setSaved] = useState(blank);
  const [exists, setExists] = useState(false);
  const [entryMeta, setEntryMeta] = useState(null);
  const [mood, setMood] = useState(null);
  const [moodError, setMoodError] = useState('');
  const [moodBusy, setMoodBusy] = useState(false);
  const [moodDialog, setMoodDialog] = useState(false);
  const [moodExcerpt, setMoodExcerpt] = useState('');
  const moodGeneration = useRef(0);
  const analysisAbort = useRef(null);
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
  useEffect(() => () => { analysisAbort.current?.abort(); }, []);

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
        setEntryMeta(result.success ? { id: result.data.id, contentVersion: result.data.contentVersion } : null);
        setMood(null);
        setMoodError('');
        const moodAtLoad = moodGeneration.current;
        if (result.success) getDailyMood(selectedDate).then((moodResult) => {
          if (!active || currentRequest !== requestId.current || currentView !== viewVersion.current || moodAtLoad !== moodGeneration.current) return;
          if (moodResult.success) setMood(moodResult.data.status === 'analyzed' ? moodResult.data.data : null);
          else setMoodError(moodResult.message || 'Could not load the saved mood estimate.');
        });
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

  useEffect(() => { Promise.resolve().then(() => loadHistory(historyEnd)); }, [historyEnd, loadHistory]);

  const selectDate = (next) => {
    if (!validLocalDate(next)) return false;
    if (next === selectedDate) return true;
    if (dirty && !window.confirm('This journal entry has unsaved changes. Discard them and switch dates?')) return false;
    viewVersion.current += 1;
    moodGeneration.current += 1;
    analysisAbort.current?.abort();
    setMoodDialog(false);
    setMood(null);
    setMoodError('');
    setMoodBusy(false);
    requestId.current += 1;
    setSelectedDate(next);
    const params = new URLSearchParams(searchParams);
    params.set('date', next);
    setSearchParams(params, { replace: true });
    if (next < historyStart(historyEnd) || next > historyEnd) setHistoryEnd(next > today ? today : next);
    setLoadedDate(null);
    setLoadFailed(false);
    latestDraft.current = { ...blank };
    setDraft(latestDraft.current);
    setSaved(latestDraft.current);
    setExists(false);
    setEntryMeta(null);
    setStatus('saved');
    setError('');
    return true;
  };

  const edit = (field, value) => {
    moodGeneration.current += 1;
    analysisAbort.current?.abort();
    setMood(null);
    setMoodDialog(false);
    setMoodBusy(false);
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
    moodGeneration.current += 1;
    analysisAbort.current?.abort();
    setMood(null);
    setStatus('saving');
    setError('');
    const pending = saveDailyEntry(date, payload);
    pendingMutations.current.set(date, pending);
    const result = await pending;
    if (pendingMutations.current.get(date) === pending) pendingMutations.current.delete(date);
    if (view !== viewVersion.current) {
      if (result.success) await loadHistory(historyEnd);
      return;
    }
    if (!result.success) {
      setStatus('failed');
      setError(result.message || 'Could not save. Your text is still here.');
      return;
    }
    setExists(true);
    setEntryMeta({ id: result.data.id, contentVersion: result.data.contentVersion });
    setSaved({ journal_text: result.data.journal_text, reflection_text: result.data.reflection_text });
    setStatus(sameText(latestDraft.current, payload) ? 'saved' : 'unsaved');
    await loadHistory(historyEnd);
  };

  const remove = async () => {
    if (!exists || status === 'saving') return;
    if (dirty && !window.confirm('Discard unsaved changes and delete this date?')) return;
    const view = viewVersion.current;
    const date = selectedDate;
    moodGeneration.current += 1;
    analysisAbort.current?.abort();
    setMoodDialog(false);
    setMoodBusy(false);
    setStatus('saving');
    const pending = deleteDailyEntry(date);
    pendingMutations.current.set(date, pending);
    const result = await pending;
    if (pendingMutations.current.get(date) === pending) pendingMutations.current.delete(date);
    if (view !== viewVersion.current) {
      if (result.success) await loadHistory(historyEnd);
      return;
    }
    if (!result.success) { setStatus('failed'); setError(result.message || 'Could not delete entry.'); return; }
    latestDraft.current = blank;
    setDraft(blank);
    setSaved(blank);
    setExists(false);
    setEntryMeta(null);
    setMood(null);
    setStatus('saved');
    setError('');
    await loadHistory(historyEnd);
  };

  const openMoodDialog = () => {
    if (!entryMeta || dirty || !saved.journal_text.trim() || moodBusy) return;
    setMoodExcerpt(saved.journal_text.slice(0, 12000));
    setMoodError('');
    setMoodDialog(true);
  };

  const confirmMood = async () => {
    if (!entryMeta || dirty || !moodExcerpt.trim()) return;
    const generation = moodGeneration.current;
    const view = viewVersion.current;
    const date = selectedDate;
    const meta = entryMeta;
    setMoodDialog(false);
    setMoodBusy(true);
    const controller = new AbortController();
    analysisAbort.current = controller;
    const result = await analyzeDailyMood(date, { entryId: meta.id, contentVersion: meta.contentVersion, excerpt: moodExcerpt, consent: { provider: 'deepseek', approved: true } }, controller.signal);
    if (analysisAbort.current === controller) analysisAbort.current = null;
    if (generation !== moodGeneration.current || view !== viewVersion.current) return;
    setMoodBusy(false);
    if (!result.success) { setMoodError(result.message || 'Mood analysis failed. Please try again.'); return; }
    setMood(result.data);
    setMoodError('');
    playMoodResponse(result.data.petAction);
  };

  const removeMood = async () => {
    if (!entryMeta || moodBusy) return;
    const generation = moodGeneration.current;
    const view = viewVersion.current;
    setMoodBusy(true);
    const result = await deleteDailyMood(selectedDate);
    if (generation !== moodGeneration.current || view !== viewVersion.current) return;
    setMoodBusy(false);
    if (!result.success) { setMoodError(result.message || 'Could not remove mood analysis.'); return; }
    setMood(null);
    setMoodError('');
    clearMoodResponse();
  };

  const dueTasks = tasks.filter((task) => dateOnly(task.due_date) === selectedDate);
  return <div className="mx-auto max-w-6xl p-4 md:p-8">
    <h1 className="text-3xl font-semibold text-gray-900">Daily Journal</h1>
    <p className="mt-1 text-sm text-gray-500">Write about your day and reflect on what helped.</p>
    {today !== openedToday && <div role="status" className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm">A new local day has started. Your selected date has stayed the same. <button onClick={() => { if (selectDate(today)) setOpenedToday(today); }} className="font-semibold text-indigo-700 underline">Open today</button></div>}
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <label className="text-sm font-medium" htmlFor="journal-date">Date</label>
      <input id="journal-date" type="date" value={selectedDate} onChange={(event) => { if (!selectDate(event.target.value)) event.target.value = selectedDate; }} className="rounded-lg border px-3 py-2" />
      <button onClick={() => { if (selectDate(today)) setOpenedToday(today); }} className="rounded-lg border px-3 py-2 text-sm">Today</button>
      <span aria-label="Save status" className={`text-sm ${status === 'failed' ? 'text-red-600' : 'text-gray-500'}`}>{({ saved: 'Saved', unsaved: 'Unsaved', saving: 'Saving…', failed: 'Save failed' })[status]}</span>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    {loadFailed ? <div className="mt-6"><p className="text-sm text-gray-600">This date could not be loaded. Editing is paused so another date’s text cannot be saved here.</p><button onClick={() => { setLoadFailed(false); setError(''); setLoadAttempt((value) => value + 1); }} className="mt-3 rounded-lg border px-4 py-2 text-sm">Retry loading date</button></div> : loadedDate !== selectedDate ? <p role="status" className="mt-6 text-gray-500">Loading this date…</p> : <>
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(19rem,1fr)]">
        <section className="min-w-0 rounded-2xl border bg-white p-5 md:p-6" aria-label="Journal and reflection editor">
          <div className="grid gap-5">
            <label className="block text-sm font-semibold">Journal
              <textarea aria-label="Journal text" value={draft.journal_text} maxLength={20000} onChange={(event) => edit('journal_text', event.target.value)} className="mt-2 min-h-60 w-full rounded-xl border bg-white p-4 text-base font-normal leading-7" placeholder="What happened today?" />
            </label>
            <label className="block text-sm font-semibold">Reflection
              <textarea aria-label="Reflection text" value={draft.reflection_text} maxLength={20000} onChange={(event) => edit('reflection_text', event.target.value)} className="mt-2 min-h-48 w-full rounded-xl border bg-white p-4 text-base font-normal leading-7" placeholder="What did you learn or notice?" />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3"><button onClick={save} disabled={status === 'saving' || !dirty} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">Save</button>{exists && <button onClick={remove} disabled={status === 'saving'} className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600">Delete entry</button>}</div>
        </section>
        <section className="min-w-0 rounded-2xl border bg-white p-5 md:p-6" aria-labelledby="mood-heading">
          <h2 id="mood-heading" className="text-xl font-semibold">Mood score</h2>
          {mood && !dirty && <div className="mt-4" aria-live="polite">
            <div className="rounded-2xl bg-indigo-50 px-4 py-7 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">Today’s mood</p>
              <p className="mt-3 text-7xl font-bold leading-none tabular-nums text-gray-900 md:text-8xl" aria-label={`Mood score ${mood.score} out of 100`}>{mood.score}<span className="ml-1 text-2xl font-medium text-gray-600">/100</span></p>
              <p className="mt-4 text-lg font-semibold text-indigo-700">{moodFeeling[mood.label] ?? 'Feeling reflective'}</p>
            </div>
            <div className="mt-6 border-t pt-5">
              <h3 className="text-base font-semibold text-gray-900">Let’s reflect together</h3>
              <p className="mt-3 text-lg leading-8 text-gray-800">{mood.responseText}</p>
            </div>
          </div>}
          <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={openMoodDialog} disabled={!entryMeta || dirty || !saved.journal_text.trim() || moodBusy || status === 'saving'} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{moodBusy ? 'Analyzing…' : 'Analyze mood'}</button>{mood && <button type="button" onClick={removeMood} disabled={moodBusy} className="rounded-lg border px-4 py-2 text-sm">Delete estimate</button>}</div>
          {dirty && <p className="mt-3 text-sm text-gray-600">Save this journal before requesting an estimate.</p>}
          {moodError && <p role="alert" className="mt-3 text-sm text-red-600">{moodError}</p>}
        </section>
      </div>
    </>}
    <section className="mt-8 rounded-2xl border bg-white p-5"><h2 className="text-lg font-semibold">Tasks due on this date</h2><p className="mt-1 text-sm text-gray-500">{dueTasks.length} tasks</p>{dueTasks.length > 0 && <ul className="mt-3 space-y-2 text-sm">{dueTasks.map((task) => <li key={task.id} className="flex gap-3"><span className={task.status === 'completed' ? 'text-emerald-600' : 'text-gray-700'}>{task.status === 'completed' ? 'Done' : 'Open'}</span><span>{task.title}</span></li>)}</ul>}</section>
    <section className="mt-8"><h2 className="text-lg font-semibold">History</h2><p className="text-sm text-gray-500">Saved entries from {historyStart(historyEnd)} to {historyEnd}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setHistoryEnd(DateTime.fromISO(historyStart(historyEnd)).minus({ days: 1 }).toISODate())} className="min-h-11 rounded-lg border px-3 py-2 text-sm">Older entries</button><button type="button" onClick={() => setHistoryEnd(DateTime.fromISO(historyEnd).plus({ days: 366 }).toISODate() > today ? today : DateTime.fromISO(historyEnd).plus({ days: 366 }).toISODate())} disabled={historyEnd >= today} className="min-h-11 rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Newer entries</button></div>{historyError && <div className="mt-2"><p role="alert" className="text-sm text-red-600">{historyError}</p><button onClick={() => loadHistory(historyEnd)} className="mt-2 rounded-lg border px-3 py-2 text-sm">Retry history</button></div>}{!historyError && (history.length === 0 ? <p className="mt-3 text-sm text-gray-500">No saved entries in this range.</p> : <ul className="mt-3 space-y-2">{history.map((entry) => <li key={entry.id}><button onClick={() => selectDate(entry.local_date)} className="w-full min-w-0 rounded-lg border bg-white px-4 py-3 text-left text-sm hover:border-indigo-300"><span className="font-medium">{entry.local_date}</span><span className="ml-3 break-words text-gray-500">{entry.journal_text.slice(0, 60) || entry.reflection_text.slice(0, 60)}</span></button></li>)}</ul>)}</section>
    {blocker.state === 'blocked' && <div role="dialog" aria-modal="true" aria-labelledby="unsaved-journal-title" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 id="unsaved-journal-title" className="text-lg font-semibold">Leave without saving?</h2><p className="mt-2 text-sm text-gray-600">Your journal text has unsaved changes.</p><div className="mt-5 flex justify-end gap-3"><button onClick={() => blocker.reset()} className="rounded-lg border px-4 py-2 text-sm">Keep editing</button><button onClick={() => blocker.proceed()} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white">Discard changes</button></div></div></div>}
    {moodDialog && <div role="dialog" aria-modal="true" aria-labelledby="mood-consent-title" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-2xl border bg-white p-5 shadow-xl"><h2 id="mood-consent-title" className="text-lg font-semibold">Review what you will send</h2><p className="mt-2 text-sm text-gray-600">This text from your saved journal for {selectedDate} will be sent to DeepSeek for a mood estimate. Reflection, other dates, notes, and tasks are excluded. You can shorten the selection to a passage from this journal.</p><textarea aria-label="Text to send to DeepSeek" value={moodExcerpt} maxLength={12000} onChange={(event) => setMoodExcerpt(event.target.value)} className="mt-3 max-h-48 min-h-32 w-full rounded-lg border p-3 text-sm" /><div className="mt-4 flex flex-wrap justify-end gap-3"><button type="button" autoFocus onClick={() => setMoodDialog(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel, do not send</button><button type="button" onClick={confirmMood} disabled={!moodExcerpt.trim() || !saved.journal_text.includes(moodExcerpt)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">Confirm and send</button></div></div></div>}
  </div>;
}
