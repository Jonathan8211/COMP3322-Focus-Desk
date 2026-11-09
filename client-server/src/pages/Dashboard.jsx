import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import ChecklistProgress from '../components/ChecklistProgress';
import { useTasks } from '../contexts/useTasks';

const chartColors = { Open: '#6366f1', Completed: '#10b981' };

export default function Dashboard({ showSummary = false }) {
  const { tasks, stats, addTask, changeTask, removeTask } = useTasks();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const visibleTasks = tasks.filter((task) =>
    (statusFilter === 'all' || task.status === statusFilter) &&
    (priorityFilter === 'all' || task.priority === priorityFilter));
  const chartData = [
    { name: 'Open', value: stats.pending },
    { name: 'Completed', value: stats.completed },
  ];

  const add = async (event) => {
    event.preventDefault();
    if (!title.trim() || adding) return;
    setAdding(true);
    const result = await addTask({ title: title.trim(), due_date: dueDate || null, priority });
    setAdding(false);
    if (!result.success) { setError(result.message || 'Could not create task.'); return; }
    setTitle(''); setDueDate(''); setError('');
  };

  const toggle = async (task) => {
    setBusyId(task.id);
    const result = await changeTask(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' });
    setBusyId(null);
    setError(result.success || result.cancelled ? '' : result.message || 'Could not update task.');
  };

  const remove = async (task) => {
    if (!window.confirm('Delete “' + task.title + '”?')) return;
    setBusyId(task.id);
    const result = await removeTask(task.id);
    setBusyId(null);
    setError(result.success ? '' : result.message || 'Could not delete task.');
  };

  return <section className="mx-auto max-w-5xl p-4 md:p-8">
    <h1 className="text-3xl font-bold text-gray-900">{showSummary ? 'Dashboard' : 'Tasks'}</h1>
    <p className="mt-1 text-sm text-gray-500">Keep today clear and your work moving.</p>

    {showSummary && <>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">{[
        ['All tasks', stats.total], ['Open', stats.pending], ['Completed', stats.completed],
        ['Overdue', stats.overdue], ['Completion rate', stats.completionRate + '%'],
      ].map(([label, value]) => <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div>
      <div className="mt-4 grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-[minmax(0,260px)_1fr]" aria-label="Task status chart">
        <div className="h-52" data-testid="task-status-chart">
          {stats.total > 0 ? <PieChart width={260} height={208}><Pie data={chartData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} isAnimationActive={false}>{chartData.map((slice) => <Cell key={slice.name} fill={chartColors[slice.name]} />)}</Pie><Tooltip /></PieChart> : <p className="grid h-full place-items-center text-sm text-gray-500">No tasks yet</p>}
        </div>
        <div className="flex flex-col justify-center gap-3 text-sm">
          <h2 className="text-lg font-semibold text-gray-900">Task status</h2>
          {chartData.map((slice) => <p key={slice.name} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: chartColors[slice.name] }} />{slice.name}: <strong>{slice.value}</strong></p>)}
          <p>Completion rate: <strong>{stats.completionRate}%</strong></p>
          <div role="progressbar" aria-label="Completion rate" aria-valuenow={stats.completionRate} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-emerald-500" style={{ width: stats.completionRate + '%' }} /></div>
        </div>
      </div>
    </>}

    <form onSubmit={add} className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-gray-200 bg-white p-4">
      <input aria-label="Task title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task" className="min-w-0 flex-1 rounded-lg border px-3 py-2" required />
      <input aria-label="Due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="min-w-0 rounded-lg border px-3 py-2" />
      <select aria-label="Priority" value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-lg border px-3 py-2"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
      <button disabled={adding} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{adding ? 'Adding…' : 'Add'}</button>
    </form>

    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <label className="text-sm text-gray-600">Status <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="ml-1 rounded-lg border bg-white px-2 py-2"><option value="all">All</option><option value="pending">Open</option><option value="completed">Completed</option></select></label>
      <label className="text-sm text-gray-600">Priority <select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="ml-1 rounded-lg border bg-white px-2 py-2"><option value="all">All</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
      <span className="text-sm text-gray-500">Showing {visibleTasks.length} of {tasks.length}</span>
    </div>

    <div className="mt-4 space-y-2">{visibleTasks.map((task) => <div key={task.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <input type="checkbox" aria-label={'Complete ' + task.title} checked={task.status === 'completed'} disabled={busyId === task.id} onChange={() => toggle(task)} />
      <Link to={'/tasks/' + task.id} className={'min-w-0 flex-1 break-words ' + (task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900')}>{task.title}</Link>
      <ChecklistProgress task={task} />
      {task.due_date && <span className="text-xs text-gray-500">{String(task.due_date).slice(0, 10)}</span>}
      <button onClick={() => remove(task)} disabled={busyId === task.id} className="text-xs text-red-600 disabled:opacity-50" aria-label={'Delete ' + task.title}>Delete</button>
    </div>)}</div>
    {visibleTasks.length === 0 && <p className="mt-6 text-sm text-gray-500">{tasks.length ? 'No tasks match these filters.' : 'No tasks yet. Add your first one above.'}</p>}
  </section>;
}
