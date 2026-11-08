import { useState } from "react";
import { Routes, Route, Navigate, Outlet, useNavigate, useParams } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Completed from "./pages/Completed";
import CalendarView from "./pages/CalendarView";
import Projects from "./pages/Projects";
import Kanban from "./pages/Kanban";
import TableView from "./pages/TableView";
import NotionPages from "./pages/NotionPages";
import Settings from "./pages/Settings";
import Sidebar from "./components/Sidebar";
import { updateTask, deleteTask, logoutUser } from "./services/api";
import { useTasks } from "./contexts/useTasks";
import { useAuth } from "./contexts/useAuth";

function TaskDetail({ tasks }) {
  const { id } = useParams();
  const task = tasks.find((item) => String(item.id) === id);
  return <section className="p-8"><h1 className="text-2xl font-bold">{task?.title || "Task details"}</h1><p className="text-gray-500 mt-3">{task?.description || "Task details and checklist will appear here."}</p></section>;
}

function Journal() {
  return <section className="p-8"><h1 className="text-2xl font-bold">Daily Journal</h1><p className="text-gray-500 mt-3">Your daily reflection space is being prepared.</p></section>;
}

function Credits() {
  return <section className="p-8"><h1 className="text-2xl font-bold">About FocusDesk</h1><p className="text-gray-500 mt-3">A calm space to plan tasks, projects, notes, and daily reflections.</p></section>;
}

export default function App() {
  const navigate = useNavigate();
  const { user, loading, signOut, updateUser } = useAuth();
  const { tasks, stats, loading: tasksLoading, error: tasksError, loadAllTasks } = useTasks();
  const [logoutError, setLogoutError] = useState("");
  const authenticated = Boolean(user);
  const logout = async () => {
    const result = await logoutUser();
    if (!result.success) {
      setLogoutError(result.message || "Could not sign out.");
      return;
    }
    signOut();
    setLogoutError("");
    navigate("/login");
  };
  const toggle = async (task) => {
    const result = await updateTask(task.id, { status: task.status === "completed" ? "pending" : "completed" });
    if (result.success) await loadAllTasks();
  };
  const remove = async (id) => { const result = await deleteTask(id); if (result.success) await loadAllTasks(); };
  if (loading) return <div role="status" className="min-h-screen grid place-items-center text-gray-600">Loading FocusDesk…</div>;
  const protectedPage = (element) => authenticated ? element : <Navigate to="/login" replace />;
  const layout = <div className="min-h-screen flex bg-gray-50"><Sidebar user={user} onLogout={logout} /><main className="min-w-0 flex-1">{logoutError && <p role="alert" className="p-3 text-red-600">{logoutError}</p>}{tasksError && <p role="alert" className="p-3 text-red-600">{tasksError}</p>}{tasksLoading && <p role="status" className="p-3 text-gray-500">Loading tasks…</p>}<Outlet /></main></div>;
  return <Routes>
    <Route path="/login" element={authenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
    <Route path="/register" element={authenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
    <Route element={protectedPage(layout)}>
      <Route path="/dashboard" element={<Dashboard tasks={tasks} stats={stats} onTasksChanged={loadAllTasks} showSummary />} />
      <Route path="/tasks" element={<Dashboard tasks={tasks} stats={stats} onTasksChanged={loadAllTasks} />} />
      <Route path="/tasks/:id" element={<TaskDetail tasks={tasks} />} />
      <Route path="/projects" element={<Projects tasks={tasks} onTasksChanged={loadAllTasks} />} />
      <Route path="/kanban" element={<Kanban tasks={tasks} onTasksChanged={loadAllTasks} timezone={user?.timezone} />} />
      <Route path="/table" element={<TableView tasks={tasks} onTasksChanged={loadAllTasks} timezone={user?.timezone} />} />
      <Route path="/completed" element={<Completed tasks={tasks} onToggle={toggle} onDelete={remove} />} />
      <Route path="/calendar" element={<CalendarView tasks={tasks} timezone={user?.timezone} />} />
      <Route path="/notes" element={<NotionPages />} />
      <Route path="/journal" element={<Journal />} />
      <Route path="/settings" element={<Settings user={user} onUserUpdated={updateUser} />} />
      <Route path="/credits" element={<Credits />} />
    </Route>
    <Route path="*" element={<Navigate to={authenticated ? "/dashboard" : "/login"} replace />} />
  </Routes>;
}
