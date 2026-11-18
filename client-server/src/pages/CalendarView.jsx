import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import ChecklistProgress from "../components/ChecklistProgress";
import { dateOnly, daysFromToday, todayDateOnly } from "../utils/dateOnly";
import { useTasks } from "../contexts/useTasks";

const PRIORITY_COLOR = {
  high: "bg-red-100 text-red-600 border-red-200",
  medium: "bg-amber-100 text-amber-600 border-amber-200",
  low: "bg-emerald-100 text-emerald-600 border-emerald-200",
};

export default function CalendarView({ timezone }) {
  const { tasks } = useTasks();
  const [todayYear, todayMonth, todayDay] = todayDateOnly(timezone).split("-").map(Number);
  const today = new Date(todayYear, todayMonth - 1, todayDay);
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const tasksByDate = useMemo(() => {
    const grouped = new Map();
    for (const task of tasks) {
      const day = dateOnly(task.due_date);
      if (!day) continue;
      if (!grouped.has(day)) grouped.set(day, []);
      grouped.get(day).push(task);
    }
    for (const dayTasks of grouped.values()) dayTasks.sort((a, b) =>
      Number(a.status === 'completed') - Number(b.status === 'completed') || a.title.localeCompare(b.title));
    return grouped;
  }, [tasks]);

  const prevMonth = () => { setSelectedDay(null); setCurrentMonth(new Date(year, month - 1, 1)); };
  const nextMonth = () => { setSelectedDay(null); setCurrentMonth(new Date(year, month + 1, 1)); };

  const dateKey = (day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const getTasksForDay = (day) => tasksByDate.get(dateKey(day)) || [];

  const isToday = (day) => {
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  const monthName = currentMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const [selectedDay, setSelectedDay] = useState(null);
  const selectedTasks = selectedDay ? getTasksForDay(selectedDay) : [];

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Calendar</h2>
        <p className="text-gray-400 text-sm mt-1">Tasks by due date · {tasks.filter((task) => task.due_date).length} scheduled</p>
      </div>

      <div className="min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-5 mb-5">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="font-semibold text-gray-900 capitalize">{monthName}</h3>
          <button onClick={nextMonth} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition" aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid min-w-0 grid-cols-7 gap-1">
          {/* Empty cells */}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}

          {/* Days */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayTasks = getTasksForDay(day);
            return (
              <button
                key={day}
                data-date={dateKey(day)}
                aria-label={`${dateKey(day)}, ${dayTasks.length} tasks${dayTasks.length ? ', show all' : ''}`}
                aria-pressed={selectedDay === day}
                onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                className={`min-w-0 min-h-20 sm:min-h-32 overflow-hidden flex flex-col items-stretch gap-1 rounded-xl p-1 sm:p-2 text-left text-sm transition ${
                  isToday(day) ? "bg-gray-900 text-white" :
                  selectedDay === day ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" :
                  "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <span className="font-semibold text-xs">{day}</span>
                {dayTasks.slice(0, 3).map((task, index) => <span key={task.id} title={task.title} className={`${index > 0 ? 'hidden sm:block' : 'calendar-event-title'} w-full min-w-0 rounded px-0.5 text-[9px] leading-3 sm:truncate sm:leading-4 sm:text-xs ${isToday(day) ? 'bg-white/20 text-white' : task.status === 'completed' ? 'bg-emerald-50 text-emerald-800 line-through' : 'bg-indigo-50 text-indigo-800'}`}>
                  {task.status === 'completed' ? '✓ ' : '• '}{task.title}
                </span>)}
                {dayTasks.length > 1 && <span className="block min-w-0 break-words text-center text-[9px] leading-3 sm:hidden">+{dayTasks.length - 1} more</span>}
                {dayTasks.length > 3 && <span className="hidden min-w-0 truncate text-xs leading-4 sm:block">+{dayTasks.length - 3} more</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day tasks */}
      {selectedDay && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Tasks on {selectedDay} {currentMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </h3>
          {selectedTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-gray-400 text-sm">No tasks on this day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map((task) => (
                <div key={task.id} className="min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === "completed" ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <Link to={`/tasks/${task.id}`} className={`min-w-0 basis-40 break-words text-sm flex-1 ${task.status === "completed" ? "line-through text-gray-500" : "text-gray-800"}`}>{task.title}</Link>
                  <ChecklistProgress task={task} />
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[task.priority || "medium"]}`}>{task.priority || "medium"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming tasks list */}
      {!selectedDay && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Dated open tasks</h3>
          {tasks.filter((t) => t.due_date && t.status !== "completed").length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-gray-400 text-sm">No upcoming tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks
                .filter((t) => t.due_date && t.status !== "completed")
                .sort((a, b) => dateOnly(a.due_date).localeCompare(dateOnly(b.due_date)))
                .map((task) => {
                  const diff = daysFromToday(task.due_date, timezone);
                  return (
                    <div key={task.id} className="min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${diff < 0 ? "bg-red-400" : diff === 0 ? "bg-amber-400" : "bg-indigo-400"}`} />
                      <Link to={`/tasks/${task.id}`} className="min-w-0 basis-40 break-words text-sm text-gray-800 flex-1 hover:underline">{task.title}</Link>
                      <span className={`text-xs font-medium ${diff < 0 ? "text-red-500" : diff === 0 ? "text-amber-500" : "text-gray-400"}`}>
                        {diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? "Today" : `in ${diff}d`}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
