import { NavLink } from "react-router-dom";
import { LayoutDashboard, ListTodo, Folder, Columns3, Table2, CheckCircle2, CalendarDays, NotebookPen, BookOpen, Settings, LogOut, Info } from "lucide-react";
import BrandMark from "./BrandMark";
import ThemeSwitcher from "./ThemeSwitcher";

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
  return <aside className="w-full md:w-56 shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200 md:min-h-screen p-3 md:p-4 flex flex-col">
    <div className="flex items-center gap-2 px-2 py-2 md:py-3 md:mb-4"><BrandMark size="sm" /><span className="font-bold text-gray-900">FocusDesk</span><button onClick={onLogout} className="ml-auto text-sm text-gray-600 md:hidden">Sign out</button></div>
    <div className="mb-3 px-2"><ThemeSwitcher className="w-full" /></div>
    <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto md:block md:space-y-1">
      {navigation.map(([label, href, Icon]) => <NavLink key={href} to={href} className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm ${isActive ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-600 hover:bg-gray-100"}`}><Icon size={17} />{label}</NavLink>)}
    </nav>
    <div className="hidden md:block border-t border-gray-100 pt-4 mt-auto px-2 text-sm text-gray-600">
      <p className="truncate mb-3">{user?.name}</p>
      <button onClick={onLogout} className="flex items-center gap-2 hover:text-gray-900"><LogOut size={16} />Sign out</button>
    </div>
  </aside>;
}
