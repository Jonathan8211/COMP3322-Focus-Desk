import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PRIORITY_COLOR = {
  high: "bg-red-100 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800",
  medium: "bg-amber-100 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-800",
  low: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200 dark:border-emerald-800",
};

export default function CalendarView({ tasks }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const getTasksForDay = (day) => {
    return tasks.filter((t) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

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
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Calendar</h2>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Tasks by due date</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm dark:shadow-none p-5 mb-5">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{monthName}</h3>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition" aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells */}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}

          {/* Days */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayTasks = getTasksForDay(day);
            const hasOverdue = dayTasks.some((t) => t.status !== "completed");
            const allDone = dayTasks.length > 0 && dayTasks.every((t) => t.status === "completed");

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                className={`relative aspect-square flex flex-col items-center justify-start pt-1.5 rounded-xl text-sm transition ${
                  isToday(day) ? "bg-gray-900 text-white" :
                  selectedDay === day ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800" :
                  "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                <span className="font-medium text-xs">{day}</span>
                {dayTasks.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    <div className={`w-1 h-1 rounded-full ${
                      isToday(day) ? "bg-white" :
                      allDone ? "bg-emerald-400" :
                      hasOverdue ? "bg-amber-400" : "bg-gray-300"
                    }`} />
                    {dayTasks.length > 1 && <div className={`w-1 h-1 rounded-full ${isToday(day) ? "bg-white/60" : "bg-gray-200 dark:bg-gray-600"}`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day tasks */}
      {selectedDay && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Tasks on {selectedDay} {currentMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </h3>
          {selectedTasks.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm dark:shadow-none p-6 text-center">
              <p className="text-gray-400 dark:text-gray-500 text-sm">No tasks on this day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map((task) => (
                <div key={task.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm dark:shadow-none px-4 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === "completed" ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span className={`text-sm flex-1 ${task.status === "completed" ? "line-through text-gray-300 dark:text-gray-600" : "text-gray-800 dark:text-gray-100"}`}>{task.title}</span>
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
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Upcoming Tasks</h3>
          {tasks.filter((t) => t.due_date && t.status !== "completed").length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm dark:shadow-none p-6 text-center">
              <p className="text-gray-400 dark:text-gray-500 text-sm">No upcoming tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks
                .filter((t) => t.due_date && t.status !== "completed")
                .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                .slice(0, 5)
                .map((task) => {
                  const due = new Date(task.due_date);
                  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={task.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm dark:shadow-none px-4 py-3 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${diff < 0 ? "bg-red-400" : diff === 0 ? "bg-amber-400" : "bg-indigo-400"}`} />
                      <span className="text-sm text-gray-800 dark:text-gray-100 flex-1">{task.title}</span>
                      <span className={`text-xs font-medium ${diff < 0 ? "text-red-500" : diff === 0 ? "text-amber-500" : "text-gray-400 dark:text-gray-500"}`}>
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