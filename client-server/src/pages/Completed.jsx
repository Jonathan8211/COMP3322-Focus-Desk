import { Check, CalendarDays, Target, X } from "lucide-react";

export default function Completed({ tasks, onToggle, onDelete }) {
    const completedTasks = tasks.filter((t) => t.status === "completed");
  
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      });
    };
  
    return (
      <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Completed</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{completedTasks.length} tasks completed</p>
        </div>
  
        {completedTasks.length === 0 ? (
          <div className="text-center py-20">
            <Target className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-gray-400 dark:text-gray-500 text-sm">No completed tasks yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-4 flex items-start gap-3 group shadow-sm dark:shadow-none"
              >
                <button
                  onClick={() => onToggle(task)}
                  className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 bg-emerald-500 border-emerald-500 transition"
                >
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </button>
  
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-through text-gray-300 dark:text-gray-600">{task.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {task.due_date && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-300 dark:text-gray-600">
                        <CalendarDays className="w-3 h-3" />
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>
  
                <button
                  onClick={() => onDelete(task.id)}
                  className="text-gray-200 dark:text-gray-700 hover:text-red-400 transition opacity-0 group-hover:opacity-100 p-0.5"
                  aria-label="Delete task"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
