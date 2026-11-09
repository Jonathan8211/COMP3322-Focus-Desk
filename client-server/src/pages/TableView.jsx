import { useState } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, flexRender } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import ChecklistProgress from '../components/ChecklistProgress';
import { useTasks } from '../contexts/useTasks';
import useDebounce from '../hooks/useDebounce';
import { dateOnly, formatDateOnly, todayDateOnly } from '../utils/dateOnly';

export default function TableView({ timezone = 'UTC' }) {
  const { tasks, changeTask, removeTask } = useTasks();
  const [sorting, setSorting] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const filter = useDebounce(searchInput, 250);

  const update = async (task, data) => {
    setBusyId(task.id);
    const result = await changeTask(task.id, data);
    setBusyId(null);
    setError(result.success || result.cancelled ? '' : result.message || 'Could not update task.');
    return result.success;
  };
  const saveEdit = async (task) => {
    if (!editing || busyId === task.id) return;
    const value = editing.field === 'due_date' ? editing.value || null : editing.value.trim();
    if (editing.field === 'title' && !value) { setError('Task title cannot be empty.'); return; }
    if (await update(task, { [editing.field]: value })) setEditing(null);
  };
  const remove = async (task) => {
    if (!window.confirm('Delete “' + task.title + '”?')) return;
    setBusyId(task.id);
    const result = await removeTask(task.id);
    setBusyId(null);
    setError(result.success ? '' : result.message || 'Could not delete task.');
  };
  const editField = (task, field) => setEditing({ id: task.id, field, value: field === 'due_date' ? dateOnly(task.due_date) : task.title });
  const editor = (task, field) => <div className="flex items-center gap-1">
    <input autoFocus type={field === 'due_date' ? 'date' : 'text'} aria-label={field === 'due_date' ? 'Edit due date' : 'Edit title'} value={editing.value} onChange={(event) => setEditing({ ...editing, value: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') saveEdit(task); if (event.key === 'Escape') setEditing(null); }} className="min-w-28 rounded border px-2 py-1 text-sm" />
    <button onClick={() => saveEdit(task)} disabled={busyId === task.id} className="rounded border px-2 py-1 text-xs">Save</button>
    <button onClick={() => setEditing(null)} className="rounded border px-2 py-1 text-xs">Cancel</button>
  </div>;

  const columns = [
    { id: 'task', accessorKey: 'title', header: 'Task', size: 320, cell: ({ row }) => {
      const task = row.original;
      return editing?.id === task.id && editing.field === 'title' ? editor(task, 'title') : <div className="flex items-center gap-2">
        <Link to={'/tasks/' + task.id} className="max-w-44 truncate text-sm text-gray-900 hover:underline">{task.title}</Link>
        <ChecklistProgress task={task} />
        <button onClick={() => editField(task, 'title')} aria-label={'Edit title of ' + task.title} className="rounded border px-2 py-1 text-xs text-indigo-700">Edit</button>
      </div>;
    } },
    { id: 'status', accessorKey: 'status', header: 'Status', size: 130, cell: ({ row }) => {
      const task = row.original;
      return <button onClick={() => update(task, { status: task.status === 'completed' ? 'pending' : 'completed' })} disabled={busyId === task.id} aria-label={(task.status === 'completed' ? 'Reopen ' : 'Complete ') + task.title} className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50">{task.status === 'completed' ? 'Completed' : 'Open'}</button>;
    } },
    { id: 'priority', accessorKey: 'priority', header: 'Priority', size: 120, cell: ({ row }) => <select aria-label={'Priority of ' + row.original.title} value={row.original.priority || 'medium'} disabled={busyId === row.original.id} onChange={(event) => update(row.original, { priority: event.target.value })} className="rounded-lg border bg-white px-2 py-1 text-xs"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select> },
    { id: 'due', accessorKey: 'due_date', header: 'Due Date', size: 190, cell: ({ row }) => {
      const task = row.original;
      const overdue = task.due_date && task.status !== 'completed' && dateOnly(task.due_date) < todayDateOnly(timezone);
      return editing?.id === task.id && editing.field === 'due_date' ? editor(task, 'due_date') : <div className="flex items-center gap-2"><span className={'text-xs ' + (overdue ? 'text-red-600' : 'text-gray-600')}>{task.due_date ? formatDateOnly(task.due_date, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span><button onClick={() => editField(task, 'due_date')} aria-label={'Edit due date of ' + task.title} className="rounded border px-2 py-1 text-xs text-indigo-700">Edit</button></div>;
    } },
    { id: 'project', accessorKey: 'project', header: 'Project', size: 130, cell: ({ row }) => <span className="text-xs text-gray-600">{row.original.project || '—'}</span> },
    { id: 'actions', header: 'Actions', size: 90, enableSorting: false, cell: ({ row }) => <button onClick={() => remove(row.original)} disabled={busyId === row.original.id} aria-label={'Delete ' + row.original.title} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 disabled:opacity-50">Delete</button> },
  ];

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data: tasks, columns, getRowId: (task) => String(task.id), state: { sorting, globalFilter: filter }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel() });

  return <section className="w-full min-w-0 p-4 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Table View</h1><p className="mt-1 text-sm text-gray-500">{tasks.length} tasks · {tasks.filter((task) => task.status === 'completed').length} completed</p></div><input aria-label="Search tasks" placeholder="Search tasks…" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm sm:w-56" /></div>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    <div className="mt-5 max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-white" aria-label="Scrollable task table">
      <table className="min-w-[980px] w-full text-left"><thead><tr>{table.getHeaderGroups().flatMap((group) => group.headers).map((header) => <th key={header.id} style={{ width: header.getSize() }} className={'border-b bg-white px-3 py-3 text-xs font-semibold uppercase text-gray-500 ' + (header.column.id === 'actions' ? 'sticky right-0' : '')}>{header.isPlaceholder ? null : header.column.getCanSort() ? <button onClick={header.column.getToggleSortingHandler()} aria-label={'Sort by ' + header.column.columnDef.header} className="text-left">{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}</button> : flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr></thead>
        <tbody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <tr key={row.id} className="border-b last:border-b-0">{row.getVisibleCells().map((cell) => <td key={cell.id} className={'bg-white px-3 py-3 ' + (cell.column.id === 'actions' ? 'sticky right-0 border-l' : '')}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>) : <tr><td colSpan={columns.length} className="p-10 text-center text-sm text-gray-500">{filter ? 'No matching tasks.' : 'No tasks yet.'}</td></tr>}</tbody>
      </table>
    </div>
    <p className="mt-3 text-xs text-gray-500">Showing {table.getRowModel().rows.length} of {tasks.length} tasks. Scroll the table to view every field.</p>
  </section>;
}
