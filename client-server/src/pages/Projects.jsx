import { useState, useEffect } from "react";
import { getProjects, createProject, deleteProject, updateTask } from "../services/api";
import { Folder, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import ChecklistProgress from "../components/ChecklistProgress";

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

const PRIORITY_COLOR = {
  high: "bg-red-50 dark:bg-red-900/20 text-red-500",
  medium: "bg-amber-50 dark:bg-amber-900/20 text-amber-500",
  low: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500",
};

export default function Projects({ tasks, onTasksChanged }) {
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchProjects() {
    setLoading(true);
    const res = await getProjects();
    if (res.success) setProjects(res.data);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await createProject({ name: newName, color: newColor });
    if (res.success) {
      setProjects([res.data, ...projects]);
      setNewName(""); setNewColor("#6366f1"); setShowForm(false);
      setError("");
    } else {
      setError(res.message || "Could not create project.");
    }
  };

  const handleDelete = async (id) => {
    const res = await deleteProject(id);
    if (res.success) {
      setProjects((current) => current.filter((p) => p.id !== id));
      await onTasksChanged();
    } else setError(res.message || "Could not delete project.");
  };

  const handleAssign = async (taskId, projectName) => {
    const res = await updateTask(taskId, { project: projectName });
    if (res.success) await onTasksChanged();
    else setError(res.message || "Could not assign task.");
  };

  const getProjectTasks = (name) => tasks.filter((t) => t.project === name);
  const unassigned = tasks.filter((t) => !t.project);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Projects</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{projects.length} active projects</p>
        </div>
        <button onClick={() => { setError(""); setShowForm(true); }} className="inline-flex items-center gap-1.5 bg-gray-900 dark:bg-blue-600 hover:bg-gray-700 dark:hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-xl transition font-medium">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm dark:shadow-none p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">New Project</h3>
          {error && <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">{error}</p>}
          <input
            autoFocus type="text" placeholder="Project name..."
            value={newName} onChange={(e) => setNewName(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400 dark:focus:border-gray-500 mb-3"
          />
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-400 dark:text-gray-500">Color:</span>
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full transition ${newColor === c ? "ring-2 ring-offset-2 ring-gray-400" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-gray-900 dark:bg-blue-600 text-white text-xs px-5 py-2 rounded-full hover:bg-gray-700 dark:hover:bg-blue-500 transition font-medium">
              Save
            </button>
            <button type="button" onClick={() => { setError(""); setShowForm(false); }} className="border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs px-5 py-2 rounded-full hover:border-gray-400 dark:hover:border-gray-500 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-blue-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-5">
          {projects.map((project) => {
            const ptasks = getProjectTasks(project.name);
            const done = ptasks.filter((t) => t.status === "completed").length;
            const progress = ptasks.length > 0 ? Math.round((done / ptasks.length) * 100) : 0;
            return (
              <div key={project.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm dark:shadow-none p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{project.name}</h3>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{ptasks.length} tasks</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{done}/{ptasks.length} completed</span>
                    <button onClick={() => handleDelete(project.id)} className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition p-0.5" aria-label="Delete project">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-4">
                  <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: project.color }} />
                </div>
                {ptasks.length === 0 ? (
                  <p className="text-xs text-gray-300 dark:text-gray-600 text-center py-2">No tasks in this project</p>
                ) : (
                  <div className="space-y-2">
                    {ptasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 py-1">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.status === "completed" ? "bg-emerald-400" : "bg-gray-300"}`} />
                        <Link to={`/tasks/${task.id}`} className={`text-sm flex-1 ${task.status === "completed" ? "line-through text-gray-300 dark:text-gray-600" : "text-gray-700 dark:text-gray-200"}`}>{task.title}</Link>
                        <ChecklistProgress task={task} />
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLOR[task.priority || "medium"]}`}>{task.priority || "medium"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned */}
          {unassigned.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-3">Unassigned Tasks ({unassigned.length})</h3>
              <div className="space-y-2">
                {unassigned.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200 flex-shrink-0" />
                    <Link to={`/tasks/${task.id}`} className="text-sm text-gray-600 dark:text-gray-300 flex-1 truncate">{task.title}</Link>
                    <ChecklistProgress task={task} />
                    {projects.length > 0 && (
                      <select onChange={(e) => e.target.value && handleAssign(task.id, e.target.value)} defaultValue=""
                        className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 outline-none text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-950">
                        <option value="" disabled>Assign...</option>
                        {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length === 0 && unassigned.length === 0 && (
            <div className="text-center py-20">
              <Folder className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-gray-400 dark:text-gray-500 text-sm">No tasks yet. Add a task first!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
