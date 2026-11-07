import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateTask } from "../services/api";
import { CalendarDays, Columns3 } from "lucide-react";

const COLUMNS = [
  { id: "todo",       label: "To Do",       color: "bg-gray-100 dark:bg-gray-900",     dot: "bg-gray-400"    },
  { id: "inprogress", label: "In Progress",  color: "bg-blue-50 dark:bg-blue-950/30",   dot: "bg-blue-400"    },
  { id: "completed",  label: "Completed",    color: "bg-emerald-50 dark:bg-emerald-950/30", dot: "bg-emerald-400" },
];

const PRIORITY_CONFIG = {
  high:   { color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/20"    },
  medium: { color: "text-amber-500",  bg: "bg-amber-50 dark:bg-amber-900/20"  },
  low:    { color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
};

function TaskCard({ task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const p = PRIORITY_CONFIG[task.priority || "medium"];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(dateStr) < today;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-3 cursor-grab active:cursor-grabbing select-none hover:shadow-md transition-shadow"
    >
      <p className="text-sm text-gray-800 dark:text-gray-100 font-medium mb-2 leading-snug">{task.title}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full ${p.bg} ${p.color}`}>
          {task.priority || "medium"}
        </span>
        {task.due_date && (
          <span className={`inline-flex items-center gap-1 text-xs ${isOverdue(task.due_date) && task.kanban_status !== "completed" ? "text-red-400" : "text-gray-400"}`}>
            <CalendarDays className="w-3 h-3" />
            {formatDate(task.due_date)}
          </span>
        )}
        {task.project && (
          <span className="text-xs text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">
            {task.project}
          </span>
        )}
      </div>
    </div>
  );
}

function Column({ column, tasks }) {
  const { setNodeRef } = useSortable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      id={column.id}
      className={`${column.color} rounded-2xl p-4 flex flex-col min-h-96`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${column.dot}`} />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{column.label}</h3>
        <span className="ml-auto text-xs font-medium text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1 min-h-16">
          {tasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <p className="text-xs text-gray-300 dark:text-gray-600">Drop tasks here</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function Kanban({ tasks, setTasks }) {
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Use kanban_status to determine the column — not priority!
  const getColumnTasks = (columnId) => {
    return tasks.filter((t) => {
      const ks = t.kanban_status || (t.status === "completed" ? "completed" : "todo");
      return ks === columnId;
    });
  };

  const findTaskColumn = (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return null;
    return task.kanban_status || (task.status === "completed" ? "completed" : "todo");
  };

  const handleDragStart = ({ active }) => {
    setActiveTask(tasks.find((t) => t.id === active.id));
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    const activeColumn = findTaskColumn(activeId);

    // Determine the target column
    let targetColumn = COLUMNS.find((c) => c.id === overId)?.id || findTaskColumn(overId);

    if (!targetColumn || activeColumn === targetColumn) return;

    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;

    // Update status based on the column — do NOT change priority!
    const newStatus = targetColumn === "completed" ? "completed" : "pending";

    // Optimistic update — only kanban_status and status change, priority stays the same
    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? { ...t, kanban_status: targetColumn, status: newStatus }
          : t
      )
    );

    // API — only kanban_status and status are sent, priority is omitted
    await updateTask(activeId, {
      kanban_status: targetColumn,
      status: newStatus,
    });
  };

  const completedCount = tasks.filter((t) => (t.kanban_status || "todo") === "completed").length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="flex-1 p-4 md:p-8 w-full">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Kanban Board</h2>
        <p className="text-gray-400 text-sm mt-1">Drag &amp; drop tasks to change their status</p>

        {tasks.length > 0 && (
          <div className="mt-3 flex items-center gap-4">
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">{progress}% complete</span>
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={COLUMNS.map((c) => c.id)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map((column) => (
              <Column
                key={column.id}
                column={column}
                tasks={getColumnTasks(column.id)}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeTask && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-indigo-200 shadow-xl p-3 rotate-2 opacity-95">
              <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {tasks.length === 0 && (
        <div className="text-center py-20">
          <Columns3 className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-gray-400 text-sm">No tasks yet. Add one from the Dashboard first!</p>
        </div>
      )}
    </div>
  );
}