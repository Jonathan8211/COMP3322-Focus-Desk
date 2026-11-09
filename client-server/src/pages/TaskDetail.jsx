import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Checklist from '../components/Checklist';
import { getTask } from '../services/api';
import { useTasks } from '../contexts/useTasks';

export default function TaskDetail() {
  const { changeTask, loadAllTasks } = useTasks();
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [loadedId, setLoadedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmCompletion, setConfirmCompletion] = useState(false);
  const requestId = useRef(0);

  const loadTask = useCallback(async () => {
    const currentRequest = ++requestId.current;
    const result = await getTask(id);
    if (currentRequest !== requestId.current) return false;
    setLoadedId(id);
    if (result.success) { setTask(result.data); setError(''); }
    else { setTask(null); setError(result.message || 'Could not load task.'); }
    setLoading(false);
    return result.success;
  }, [id]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) loadTask(); });
    return () => { active = false; requestId.current += 1; };
  }, [loadTask]);

  const onChecklistChanged = async () => {
    await loadTask();
    await loadAllTasks();
  };

  const setTaskStatus = async (status) => {
    setSaving(true);
    setError('');
    const result = await changeTask(id, { status }, { skipChecklistPrompt: true });
    if (result.success) {
      await loadTask();
      setConfirmCompletion(false);
    } else setError(result.message || 'Could not update task.');
    setSaving(false);
  };

  const toggleTask = () => {
    if (task.status === 'completed') { setTaskStatus('pending'); return; }
    if (task.checklist_total > task.checklist_done) { setConfirmCompletion(true); return; }
    setTaskStatus('completed');
  };

  return <section className="mx-auto max-w-3xl p-4 md:p-8">
    <Link to="/tasks" className="text-sm text-indigo-600 hover:underline">← Back to tasks</Link>
    {loading || loadedId !== id ? <p role="status" className="mt-8 text-gray-500">Loading task…</p> : !task ? <p role="alert" className="mt-8 text-red-600">{error || 'Task not found.'}</p> : <>
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        <h1 className="break-words text-2xl font-semibold text-gray-900">{task.title}</h1>
        {task.description && <p className="mt-3 whitespace-pre-wrap text-gray-600">{task.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span>{task.status === 'completed' ? 'Completed' : 'Open'}</span>
          {task.due_date && <span>Due {task.due_date}</span>}
          {task.project && <span>{task.project}</span>}
        </div>
        <button type="button" onClick={toggleTask} disabled={saving} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">
          {saving ? 'Saving…' : task.status === 'completed' ? 'Reopen task' : 'Complete task'}
        </button>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
      <Checklist key={task.id} taskId={task.id} onChanged={onChecklistChanged} />
      {confirmCompletion && <div role="dialog" aria-modal="true" aria-labelledby="confirm-completion-title" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h2 id="confirm-completion-title" className="text-lg font-semibold">Finish task with items remaining?</h2>
          <p className="mt-2 text-sm text-gray-600">{task.checklist_total - task.checklist_done} checklist items are still open. You can complete the task and return to them later.</p>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setConfirmCompletion(false)} disabled={saving} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button type="button" onClick={() => setTaskStatus('completed')} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Saving…' : 'Continue anyway'}</button>
          </div>
        </div>
      </div>}
    </>}
  </section>;
}
