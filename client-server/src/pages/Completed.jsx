import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import ChecklistProgress from '../components/ChecklistProgress';
import { useTasks } from '../contexts/useTasks';
import { formatDateOnly } from '../utils/dateOnly';

export default function Completed() {
  const { tasks, changeTask, removeTask } = useTasks();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const completedTasks = tasks.filter((task) => task.status === 'completed');

  const reopen = async (task) => {
    setBusyId(task.id);
    const result = await changeTask(task.id, { status: 'pending' });
    setBusyId(null);
    setError(result.success ? '' : result.message || 'Could not reopen task.');
  };
  const remove = async (task) => {
    if (!window.confirm('Delete “' + task.title + '”?')) return;
    setBusyId(task.id);
    const result = await removeTask(task.id);
    setBusyId(null);
    setError(result.success ? '' : result.message || 'Could not delete task.');
  };

  return <section className="mx-auto w-full max-w-3xl p-4 md:p-8">
    <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Completed</h1>
    <p className="mt-1 text-sm text-gray-500">{completedTasks.length} tasks completed</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    {completedTasks.length === 0 ? <p className="mt-8 text-sm text-gray-500">No completed tasks yet.</p> : <div className="mt-6 space-y-2">{completedTasks.map((task) => <article key={task.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="min-w-0 flex-1"><Link to={'/tasks/' + task.id} className="break-words text-sm text-gray-500 line-through hover:underline">{task.title}</Link><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">{task.due_date && <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{formatDateOnly(task.due_date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}<ChecklistProgress task={task} /></div></div>
      <button onClick={() => reopen(task)} disabled={busyId === task.id} aria-label={'Reopen ' + task.title} className="rounded-lg border border-indigo-200 px-3 py-2 text-sm text-indigo-700 disabled:opacity-50">Reopen</button>
      <button onClick={() => remove(task)} disabled={busyId === task.id} aria-label={'Delete ' + task.title} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 disabled:opacity-50">Delete</button>
    </article>)}</div>}
  </section>;
}
