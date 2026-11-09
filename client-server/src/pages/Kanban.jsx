import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { CalendarDays, GripVertical } from 'lucide-react';
import ChecklistProgress from '../components/ChecklistProgress';
import { useTasks } from '../contexts/useTasks';
import { dateOnly, formatDateOnly, todayDateOnly } from '../utils/dateOnly';

const columns = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100' },
  { id: 'inprogress', label: 'In Progress', color: 'bg-blue-50' },
  { id: 'done', label: 'Completed', color: 'bg-emerald-50' },
];
const taskColumn = (task) => task.kanban_status || (task.status === 'completed' ? 'done' : 'todo');

function TaskCard({ task, timezone, busy, onMove }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: 'task:' + task.id, data: { taskId: task.id } });
  const overdue = task.due_date && task.status !== 'completed' && dateOnly(task.due_date) < todayDateOnly(timezone);
  return <article ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }} className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm" data-task-id={task.id}>
    <div className="flex items-start gap-2">
      <button type="button" {...attributes} {...listeners} aria-label={'Drag ' + task.title} className="hidden shrink-0 cursor-grab rounded p-1 text-gray-500 active:cursor-grabbing sm:block" style={{ touchAction: 'none' }}><GripVertical size={18} /></button>
      <Link to={'/tasks/' + task.id} className="min-w-0 flex-1 break-words text-sm font-medium text-gray-900 hover:underline">{task.title}</Link>
    </div>
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
      <span className="rounded-full bg-gray-100 px-2 py-0.5">{task.priority || 'medium'}</span>
      {task.due_date && <span className={'inline-flex items-center gap-1 ' + (overdue ? 'text-red-600' : '')}><CalendarDays size={12} />{formatDateOnly(task.due_date, { day: 'numeric', month: 'short' })}</span>}
      {task.project && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">{task.project}</span>}
      <ChecklistProgress task={task} />
    </div>
    <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">Move to
      <select aria-label={'Move ' + task.title} value={taskColumn(task)} disabled={busy} onChange={(event) => onMove(task, event.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 disabled:opacity-50">
        {columns.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
      </select>
    </label>
  </article>;
}

function Column({ column, tasks, timezone, busyId, onMove }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return <section ref={setNodeRef} aria-label={column.label + ' column'} className={'min-w-0 rounded-2xl p-4 ' + column.color + (isOver ? ' ring-2 ring-indigo-500' : '')}>
    <h3 className="mb-4 flex justify-between text-sm font-semibold text-gray-800"><span>{column.label}</span><span>{tasks.length}</span></h3>
    <div className="flex min-h-20 flex-col gap-2">{tasks.length ? tasks.map((task) => <TaskCard key={task.id} task={task} timezone={timezone} busy={busyId === task.id} onMove={onMove} />) : <p className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500">Drop tasks here</p>}</div>
  </section>;
}

export default function Kanban({ timezone = 'UTC' }) {
  const { tasks, stats, changeTask } = useTasks();
  const [activeTask, setActiveTask] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const moveTask = async (task, columnId) => {
    if (!task || taskColumn(task) === columnId || busyId === task?.id) return;
    setBusyId(task.id);
    const result = await changeTask(task.id, { kanban_status: columnId });
    setBusyId(null);
    setError(result.success || result.cancelled ? '' : result.message || 'Could not move task.');
  };

  const onDragEnd = ({ active, over }) => {
    setActiveTask(null);
    const task = tasks.find((item) => item.id === active.data.current?.taskId);
    if (over && columns.some((column) => column.id === over.id)) moveTask(task, over.id);
  };

  return <section className="w-full min-w-0 p-4 md:p-8">
    <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Kanban Board</h1>
    <p className="mt-1 text-sm text-gray-500">Drag a task or use its Move to menu.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    <div className="mt-4 flex items-center gap-3"><div role="progressbar" aria-label="Tasks completed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.completionRate} className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-indigo-500" style={{ width: stats.completionRate + '%' }} /></div><span className="text-xs text-gray-500">{stats.completionRate}% complete</span></div>
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={({ active }) => setActiveTask(tasks.find((task) => task.id === active.data.current?.taskId) || null)} onDragCancel={() => setActiveTask(null)} onDragEnd={onDragEnd}>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">{columns.map((column) => <Column key={column.id} column={column} tasks={tasks.filter((task) => taskColumn(task) === column.id)} timezone={timezone} busyId={busyId} onMove={moveTask} />)}</div>
      <DragOverlay>{activeTask && <div className="rounded-xl border border-indigo-200 bg-white p-3 text-sm font-medium shadow-xl">{activeTask.title}</div>}</DragOverlay>
    </DndContext>
    {tasks.length === 0 && <p className="mt-6 text-sm text-gray-500">No tasks yet. Add one from Tasks.</p>}
  </section>;
}
