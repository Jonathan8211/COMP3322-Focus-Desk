import { useEffect, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { generateReview, getReviewFacts, previewReview } from '../services/api';

const today = (zone) => DateTime.now().setZone(zone || 'UTC').toISODate();
const displayDay = (day) => DateTime.fromISO(day).toFormat('yyyy/LL/dd');
const displayRange = (start, endExclusive) => `${displayDay(start)}–${displayDay(DateTime.fromISO(endExclusive).minus({ days: 1 }).toISODate())}`;

function Metric({ label, value, detail }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
    <p className="text-sm text-gray-600">{label}</p><p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
    {detail && <p className="mt-1 text-xs text-gray-600">{detail}</p>}
  </div>;
}

export default function Reviews({ timezone = 'UTC' }) {
  const [period, setPeriod] = useState('week');
  const [anchor, setAnchor] = useState(() => today(timezone));
  const [review, setReview] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const abort = useRef(null);

  useEffect(() => {
    let active = true;
    const id = ++requestId.current;
    abort.current?.abort();
    abort.current = null;
    Promise.resolve().then(() => {
      if (!active) return;
      setBusy(false); setLoading(true); setError(''); setReview(null); setPreview(null); setResult(null);
      return getReviewFacts(period, anchor);
    }).then((response) => {
      if (!active || id !== requestId.current || !response) return;
      if (response.success) setReview(response.data);
      else setError(response.message || 'Could not load this review.');
    }).finally(() => { if (active && id === requestId.current) setLoading(false); });
    return () => { active = false; };
  }, [period, anchor]);
  useEffect(() => () => abort.current?.abort(), []);

  const openPreview = async () => {
    const currentRequest = requestId.current;
    setBusy(true); setError(''); setResult(null);
    const response = await previewReview(period, { anchor });
    if (currentRequest !== requestId.current) return;
    setBusy(false);
    if (response.success && response.data.sourceStatus.ready) setPreview(response.data);
    else if (response.success) { setReview(response.data); setError('This period is too large for one review. No records were sent.'); }
    else setError(response.message || 'Could not prepare the sending preview.');
  };

  const confirm = async () => {
    if (!preview?.scopeDigest) return;
    const current = preview;
    const currentRequest = requestId.current;
    setPreview(null); setBusy(true); setError('');
    const controller = new AbortController();
    abort.current = controller;
    const response = await generateReview(period, { anchor, consent: { provider: 'deepseek', approved: true, scopeDigest: current.scopeDigest } }, controller.signal);
    if (abort.current !== controller || currentRequest !== requestId.current) return;
    abort.current = null; setBusy(false);
    if (response.success) setResult(response.data);
    else {
      setResult(null);
      setError(response.message || 'Could not generate a review. Your recorded facts remain available.');
      if ([409, 413].includes(response.status)) getReviewFacts(period, anchor).then((fresh) => {
        if (currentRequest === requestId.current && fresh.success) setReview(fresh.data);
      });
    }
  };

  const entries = review?.facts.diaryEntries || [];
  const moodEntries = entries.filter((entry) => entry.mood);
  const scores = moodEntries.map((entry) => entry.mood.score);
  const moodDetail = scores.length === 0 ? 'No saved mood estimates' : scores.length === 1
    ? `Saved estimate: ${scores[0]}/100` : `Saved estimates: ${Math.min(...scores)}–${Math.max(...scores)}/100`;
  const sources = review?.sourceStatus;
  const hasSources = sources && (sources.counts.completedEvents > 0 || sources.counts.journalEntries > 0);

  return <section className="mx-auto w-full max-w-5xl p-4 pb-20 md:p-8">
    <h1 className="mb-5 text-3xl font-bold">Reviews</h1>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm font-medium">Period<select aria-label="Review period" value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1 block min-h-11 rounded-lg border border-gray-300 bg-white px-3"><option value="week">Week</option><option value="month">Month</option></select></label>
      <label className="text-sm font-medium">Choose a date<input aria-label="Review date" type="date" value={anchor} onChange={(event) => setAnchor(event.target.value)} className="mt-1 block min-h-11 rounded-lg border border-gray-300 bg-white px-3" /></label>
    </div>
    {loading && <p role="status" className="mt-5 text-sm text-gray-600">Loading review…</p>}
    {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}
    {review && <>
      <div className="mb-5 mt-5"><h2 className="text-xl font-semibold text-gray-900">{displayRange(review.startLocal, review.endExclusiveLocal)}</h2><p className="mt-1 text-xs text-gray-600">{period === 'week' ? 'Week' : 'Month'} · {timezone}</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Tasks completed" value={review.facts.completedEventCount} />
        <Metric label="Tasks open" value={review.facts.pendingNow} detail={`${review.facts.overdueNow} overdue · ${review.facts.pendingDueInPeriod} due in this period`} />
        <Metric label="Journal days" value={review.facts.diaryDays} detail={`${moodEntries.length} with a mood score · ${moodDetail}`} />
      </div>
      {review.coverage.unknownCompletedTaskCount > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p>Some completed tasks have no recorded completion date, so they are not included in this period's total.</p><details className="mt-1"><summary className="cursor-pointer font-medium">Why are some tasks missing?</summary><p className="mt-2">{review.coverage.unknownCompletedTaskCount} completed {review.coverage.unknownCompletedTaskCount === 1 ? 'task has' : 'tasks have'} no reliable completion date. Completion tracking began on {review.coverage.trackingSinceUtc ? DateTime.fromISO(review.coverage.trackingSinceUtc).setZone(timezone).toFormat('yyyy/LL/dd') : 'a later date'}. We do not guess dates from due dates or edits. Task titles shown below are their current titles.</p></details></div>}
      <details open className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 md:p-5"><summary className="cursor-pointer text-lg font-semibold">Included in this review</summary>
        <p className="mt-2 text-sm text-gray-600">All {sources.counts.completedEvents} recorded task completions, {sources.counts.journalEntries} saved Journal entries, and {sources.counts.moodScores} valid mood scores in this period are included by default. Reflection text stays private. Nothing is sent until you preview and confirm.</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div><h3 className="font-semibold">Completed tasks</h3><div className="mt-2 max-h-64 space-y-2 overflow-auto">{review.facts.completedEvents.length ? review.facts.completedEvents.map((event) => <div key={event.id} className="rounded-lg border border-gray-200 p-3 text-sm"><strong className="block break-words">{event.currentTitle || 'Deleted task'}</strong><span className="text-gray-600">{displayDay(event.completedLocalDate)}</span></div>) : <p className="py-2 text-sm text-gray-600">No recorded completions.</p>}</div></div>
          <div><h3 className="font-semibold">Journal</h3><div className="mt-2 max-h-64 space-y-2 overflow-auto">{entries.length ? entries.map((entry) => <div key={entry.id} className="rounded-lg border border-gray-200 p-3 text-sm"><strong>{displayDay(entry.localDate)}</strong><span className="ml-2 text-gray-600">{entry.journalText.trim() ? 'Saved writing' : 'No Journal text'}{entry.mood ? ` · Mood ${entry.mood.score}/100` : ''}</span></div>) : <p className="py-2 text-sm text-gray-600">No Journal entries.</p>}</div></div>
        </div>
        {!sources.ready && <div role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><p>This period has more material than one review can safely include. No records will be sent or quietly omitted.</p><p className="mt-1">Unable to include: all {sources.unableToInclude.completedEvents} task completions, {sources.unableToInclude.journalDates.length} Journal entries, and {sources.unableToInclude.moodDates.length} mood scores. {sources.reasons.includes('too_many_completions') ? `There are more than ${sources.maxCompletionEvents} completion events. ` : ''}{sources.reasons.includes('too_much_text') ? `The source text exceeds ${Math.round(sources.maxBytes / 1000)} KB. ` : ''}Choose Week instead of Month when possible. If a Week still exceeds the limit, AI review is unavailable for that period; all facts remain visible.</p><details className="mt-2"><summary className="cursor-pointer">Dates of records that cannot be included</summary><p className="mt-1">Task dates: {sources.unableToInclude.completionDates.map(displayDay).join(', ') || 'none'}</p><p>Journal dates: {sources.unableToInclude.journalDates.map(displayDay).join(', ') || 'none'}</p><p>Mood dates: {sources.unableToInclude.moodDates.map(displayDay).join(', ') || 'none'}</p></details></div>}
        <button type="button" disabled={busy || loading || !sources.ready || !hasSources} onClick={openPreview} className="mt-5 min-h-11 rounded-lg bg-indigo-700 px-5 py-2 font-medium text-white disabled:opacity-50">Preview everything to send</button>
      </details>
      {result?.reviewText && <article className="mt-6 rounded-2xl border border-indigo-200 bg-white p-5 md:p-7" aria-label="Generated review"><h2 className="text-2xl font-semibold">Your {period} in review</h2><div className="mt-5 space-y-4 text-base leading-8 text-gray-800">{[result.reviewText.completedTasks, result.reviewText.diaryExperiences, result.reviewText.recordedEmotions].map((body, index) => <p key={index} className="whitespace-pre-wrap">{body}</p>)}</div></article>}
    </>}
    {preview && <div role="dialog" aria-modal="true" aria-labelledby="review-consent-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"><div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-5 shadow-xl"><h2 id="review-consent-title" className="text-xl font-bold">Confirm what to send to DeepSeek</h2><p className="mt-2 text-sm">Every record below belongs to {displayRange(preview.startLocal, preview.endExclusiveLocal)}. Review the complete Journal text before sending. Reflection is not included. Cancel sends nothing. If DeepSeek returns unusable text, FocusDesk may retry with these same records up to two times.</p><div className="mt-4 max-h-80 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm"><h3 className="font-semibold">Task completions ({preview.scope.completedEvents.length})</h3>{preview.scope.completedEvents.length ? preview.scope.completedEvents.map((event) => <p key={event.id} className="mt-1 break-words">{displayDay(event.completedLocalDate)}: {event.currentTitle || 'Deleted task'}</p>) : <p>None in this period</p>}<h3 className="mt-4 font-semibold">Journal entries ({preview.scope.diaryEntries.length})</h3>{preview.scope.diaryEntries.length ? preview.scope.diaryEntries.map((entry) => <div key={entry.entryId} className="mt-3 border-t border-gray-200 pt-2"><strong>{displayDay(entry.localDate)}</strong><p className="mt-1 whitespace-pre-wrap break-words">{entry.journalText || 'No Journal text saved for this date.'}</p>{entry.mood && <p className="mt-1 text-gray-700">Saved mood estimate: {entry.mood.score}/100 ({entry.mood.label})</p>}</div>) : <p>None in this period</p>}</div><div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" autoFocus onClick={() => setPreview(null)} className="min-h-11 rounded-lg border border-gray-300 px-4">Cancel</button><button type="button" onClick={confirm} className="min-h-11 rounded-lg bg-indigo-700 px-4 text-white">Confirm and send all</button></div></div></div>}
  </section>;
}
