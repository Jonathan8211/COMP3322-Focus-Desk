import { useState } from "react";
import { Link } from "react-router-dom";
import { createTask, updateTask, deleteTask } from "../services/api";

export default function Dashboard({ tasks, stats, onTasksChanged, showSummary = false }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [error, setError] = useState("");
  const add = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    const result = await createTask({ title: title.trim(), due_date: dueDate || null, priority });
    if (!result.success) { setError(result.message || "Could not create task."); return; }
    await onTasksChanged();
    setTitle(""); setDueDate(""); setError("");
  };
  const toggle = async (task) => {
    const result = await updateTask(task.id, { status: task.status === "completed" ? "pending" : "completed" });
    if (result.success) await onTasksChanged();
    else setError(result.message || "Could not update task.");
  };
  const remove = async (id) => {
    const result = await deleteTask(id);
    if (result.success) await onTasksChanged();
    else setError(result.message || "Could not delete task.");
  };
  return <section className="max-w-4xl mx-auto p-6 md:p-8">
    <h1 className="text-3xl font-bold text-gray-900">{showSummary ? "Dashboard" : "Tasks"}</h1>
    <p className="mt-1 text-sm text-gray-500">Keep today clear and your work moving.</p>
    {showSummary && <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 mb-8">{[["All tasks", stats.total], ["Open", stats.pending], ["Completed", stats.completed], ["Overdue", stats.overdue], ["Completion rate", `${stats.completionRate}%`]].map(([label, value]) => <div key={label} className="bg-white border border-gray-200 rounded-2xl p-4"><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-semibold mt-2">{value}</p></div>)}</div>}
    <form onSubmit={add} className="bg-white border border-gray-200 rounded-2xl p-4 mt-6 flex flex-wrap gap-3">
      <input aria-label="Task title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task" className="border rounded-lg px-3 py-2 flex-1 min-w-44" required />
      <input aria-label="Due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="border rounded-lg px-3 py-2" />
      <select aria-label="Priority" value={priority} onChange={(event) => setPriority(event.target.value)} className="border rounded-lg px-3 py-2"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
      <button className="bg-indigo-600 text-white rounded-lg px-4 py-2">Add</button>
    </form>
    {error && <p role="alert" className="text-red-600 text-sm mt-3">{error}</p>}
    <div className="mt-6 space-y-2">{tasks.map((task) => <div key={task.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
      <input type="checkbox" aria-label={`Complete ${task.title}`} checked={task.status === "completed"} onChange={() => toggle(task)} />
      <Link to={`/tasks/${task.id}`} className={`flex-1 ${task.status === "completed" ? "line-through text-gray-400" : "text-gray-900"}`}>{task.title}</Link>
      {task.due_date && <span className="text-xs text-gray-500">{String(task.due_date).slice(0, 10)}</span>}
      <button onClick={() => remove(task.id)} className="text-xs text-red-600" aria-label={`Delete ${task.title}`}>Delete</button>
    </div>)}</div>
    {tasks.length === 0 && <p className="text-gray-500 text-sm mt-6">No tasks yet. Add your first one above.</p>}
  </section>;
}
