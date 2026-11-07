import { NavLink } from "react-router-dom";
import { LayoutDashboard, ListTodo, Folder, Columns3, Table2, CheckCircle2, CalendarDays, NotebookPen, BookOpen, Settings, LogOut, Info } from "lucide-react";
import BrandMark from "./BrandMark";

const navigation = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Tasks", "/tasks", ListTodo],
  ["Projects", "/projects", Folder],
  ["Kanban", "/kanban", Columns3],
  ["Table", "/table", Table2],
  ["Completed", "/completed", CheckCircle2],
  ["Calendar", "/calendar", CalendarDays],
  ["Notes", "/notes", NotebookPen],
  ["Journal", "/journal", BookOpen],
  ["Settings", "/settings", Settings],
  ["Credits", "/credits", Info],
];

export default function Sidebar({ user, onLogout }) {
  return <aside className="w-56 shrink-0 bg-white border-r border-gray-200 min-h-screen p-4 flex flex-col">
    <div className="flex items-center gap-2 px-2 py-3 mb-4"><BrandMark size="sm" /><span className="font-bold text-gray-900">FocusDesk</span></div>
    <nav aria-label="Main navigation" className="flex-1 space-y-1">
      {navigation.map(([label, href, Icon]) => <NavLink key={href} to={href} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${isActive ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-600 hover:bg-gray-100"}`}><Icon size={17} />{label}</NavLink>)}
    </nav>
    <div className="border-t border-gray-100 pt-4 mt-4 px-2 text-sm text-gray-600">
      <p className="truncate mb-3">{user?.name}</p>
      <button onClick={onLogout} className="flex items-center gap-2 hover:text-gray-900"><LogOut size={16} />Sign out</button>
    </div>
  </aside>;
}
