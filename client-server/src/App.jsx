import { useState } from "react";
import { Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
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
import TaskDetail from "./pages/TaskDetail";
import DailyJournal from "./pages/DailyJournal";
import { logoutUser } from "./services/api";
import { useTasks } from "./contexts/useTasks";
import { useAuth } from "./contexts/useAuth";
import PetDock from "./components/PetDock";

function Credits() {
  return <section className="p-8"><h1 className="text-2xl font-bold">About FocusDesk</h1><p className="text-gray-500 mt-3">A calm space to plan tasks, projects, notes, and daily reflections.</p></section>;
}

export default function App() {
  const navigate = useNavigate();
  const { user, loading, signOut, updateUser } = useAuth();
  const { loading: tasksLoading, error: tasksError, loadAllTasks } = useTasks();
  const [logoutError, setLogoutError] = useState("");
  const [hasUnsavedText, setHasUnsavedText] = useState(false);
  const authenticated = Boolean(user);
  const logout = async () => {
    if (hasUnsavedText && !window.confirm('You have unsaved text. Discard it and sign out?')) return;
    const result = await logoutUser();
    if (!result.success) {
      setLogoutError(result.message || "Could not sign out.");
      return;
    }
    signOut();
    setLogoutError("");
    navigate("/login");
  };
  if (loading) return <div role="status" className="min-h-screen grid place-items-center text-gray-600">Loading FocusDesk…</div>;
  const protectedPage = (element) => authenticated ? element : <Navigate to="/login" replace />;
  const layout = <div className="min-h-screen flex flex-col md:flex-row bg-gray-50"><Sidebar user={user} onLogout={logout} /><main className="min-w-0 flex-1">{logoutError && <p role="alert" className="p-3 text-red-600">{logoutError}</p>}{tasksError && <div role="alert" className="flex flex-wrap items-center gap-3 p-3 text-red-600"><span>{tasksError}</span><button type="button" onClick={loadAllTasks} disabled={tasksLoading} className="rounded border border-red-300 px-3 py-1 text-sm disabled:opacity-50">Retry loading tasks</button></div>}{tasksLoading && <p role="status" className="p-3 text-gray-500">Loading tasks…</p>}<PetDock /><Outlet /></main></div>;
  return <Routes>
    <Route path="/login" element={authenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
    <Route path="/register" element={authenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
    <Route element={protectedPage(layout)}>
      <Route path="/dashboard" element={<Dashboard showSummary />} />
      <Route path="/tasks" element={<Dashboard />} />
      <Route path="/tasks/:id" element={<TaskDetail />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/kanban" element={<Kanban timezone={user?.timezone} />} />
      <Route path="/table" element={<TableView timezone={user?.timezone} />} />
      <Route path="/completed" element={<Completed />} />
      <Route path="/calendar" element={<CalendarView timezone={user?.timezone} />} />
      <Route path="/notes" element={<NotionPages onDirtyChange={setHasUnsavedText} />} />
      <Route path="/journal" element={<DailyJournal timezone={user?.timezone} onDirtyChange={setHasUnsavedText} />} />
      <Route path="/settings" element={<Settings user={user} onUserUpdated={updateUser} />} />
      <Route path="/credits" element={<Credits />} />
    </Route>
    <Route path="*" element={<Navigate to={authenticated ? "/dashboard" : "/login"} replace />} />
  </Routes>;
}
