import { useCallback, useEffect, useState } from "react";
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
import { getTasks, updateTask, deleteTask, logoutUser } from "./services/api";

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
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  const [tasks, setTasks] = useState([]);
  const authenticated = Boolean(user && localStorage.getItem("token"));
  const loadTasks = useCallback(async () => {
    const result = await getTasks();
    if (result.success) setTasks(result.data);
  }, []);
  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    getTasks().then((result) => {
      if (active && result.success) setTasks(result.data);
    });
    return () => { active = false; };
  }, [authenticated]);
  const login = (nextUser) => { setUser(nextUser); navigate("/dashboard"); };
  const logout = async () => {
    await logoutUser();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setTasks([]);
    navigate("/login");
  };
  const updateUser = useCallback((patch) => setUser((current) => {
    const next = { ...current, ...patch };
    localStorage.setItem("user", JSON.stringify(next));
    return next;
  }), []);
  const toggle = async (task) => {
    const result = await updateTask(task.id, { status: task.status === "completed" ? "pending" : "completed" });
    if (result.success) loadTasks();
  };
  const remove = async (id) => { const result = await deleteTask(id); if (result.success) loadTasks(); };
  const protectedPage = (element) => authenticated ? element : <Navigate to="/login" replace />;
  const layout = <div className="min-h-screen flex bg-gray-50"><Sidebar user={user} onLogout={logout} /><main className="min-w-0 flex-1"><Outlet /></main></div>;
  return <Routes>
    <Route path="/login" element={authenticated ? <Navigate to="/dashboard" replace /> : <Login onLogin={login} />} />
    <Route path="/register" element={authenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
    <Route element={protectedPage(layout)}>
      <Route path="/dashboard" element={<Dashboard user={user} tasks={tasks} setTasks={setTasks} showSummary />} />
      <Route path="/tasks" element={<Dashboard user={user} tasks={tasks} setTasks={setTasks} />} />
      <Route path="/tasks/:id" element={<TaskDetail tasks={tasks} />} />
      <Route path="/projects" element={<Projects tasks={tasks} setTasks={setTasks} />} />
      <Route path="/kanban" element={<Kanban tasks={tasks} setTasks={setTasks} />} />
      <Route path="/table" element={<TableView tasks={tasks} setTasks={setTasks} />} />
      <Route path="/completed" element={<Completed tasks={tasks} onToggle={toggle} onDelete={remove} />} />
      <Route path="/calendar" element={<CalendarView tasks={tasks} onToggle={toggle} onDelete={remove} />} />
      <Route path="/notes" element={<NotionPages />} />
      <Route path="/journal" element={<Journal />} />
      <Route path="/settings" element={<Settings user={user} onUserUpdated={updateUser} />} />
      <Route path="/credits" element={<Credits />} />
    </Route>
    <Route path="*" element={<Navigate to={authenticated ? "/dashboard" : "/login"} replace />} />
  </Routes>;
}
