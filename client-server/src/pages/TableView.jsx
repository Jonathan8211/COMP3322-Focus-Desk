import { useState, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { updateTask, deleteTask } from "../services/api";
import useDebounce from "../hooks/useDebounce";
import { Check, TriangleAlert, X, Search } from "lucide-react";

const PRIORITY_CONFIG = {
  high:   { label: "High",   color: "text-red-500",     bg: "bg-red-50 dark:bg-red-900/20"     },
  medium: { label: "Medium", color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-900/20" },
  low:    { label: "Low",    color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
};

const columnHelper = createColumnHelper();

export default function TableView({ tasks, setTasks }) {
  const [sorting, setSorting] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [editingCell, setEditingCell] = useState(null); // { rowId, field }
  const [editValue, setEditValue] = useState("");
  const debouncedGlobalFilter = useDebounce(searchInput, 250);

  const handleToggle = useCallback(async (task) => {
    const status = task.status === "pending" ? "completed" : "pending";
    const res = await updateTask(task.id, { status });
    if (res.success) setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data : t)));
  }, [setTasks]);

  const handleDelete = useCallback(async (id) => {
    const res = await deleteTask(id);
    if (res.success) setTasks((prev) => prev.filter((t) => t.id !== id));
  }, [setTasks]);

  const startEdit = (rowId, field, value) => {
    setEditingCell({ rowId, field });
    setEditValue(value || "");
  };

  const saveEdit = useCallback(async (task) => {
    if (!editingCell) return;
    const { field } = editingCell;
    const res = await updateTask(task.id, { [field]: editValue });
    if (res.success) setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data : t)));
    setEditingCell(null);
  }, [editingCell, editValue, setTasks]);

  const handlePriority = useCallback(async (task, priority) => {
    const res = await updateTask(task.id, { priority });
    if (res.success) setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data : t)));
  }, [setTasks]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const isOverdue = (dateStr, status) => {
    if (!dateStr || status === "completed") return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(dateStr) < today;
  };

  const columns = useMemo(() => [
    // Status toggle
    columnHelper.accessor("status", {
      header: "",
      size: 40,
      cell: ({ row }) => (
        <button
          onClick={() => handleToggle(row.original)}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition mx-auto ${
            row.original.status === "completed"
              ? "bg-emerald-500 border-emerald-500"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-900"
          }`}
        >
          {row.original.status === "completed" && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </button>
      ),
    }),

    // Title
    columnHelper.accessor("title", {
      header: "Task",
      size: 300,
      cell: ({ row }) => {
        const isEditing = editingCell?.rowId === row.id && editingCell?.field === "title";
        return isEditing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveEdit(row.original)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit(row.original);
              if (e.key === "Escape") setEditingCell(null);
            }}
            className="w-full bg-transparent border-b border-indigo-400 outline-none text-sm text-gray-800 dark:text-gray-100 py-0.5"
          />
        ) : (
          <span
            onClick={() => startEdit(row.id, "title", row.original.title)}
            className={`text-sm cursor-pointer block truncate ${
              row.original.status === "completed"
                ? "line-through text-gray-400"
                : "text-gray-800 dark:text-gray-100 hover:text-indigo-600"
            }`}
          >
            {row.original.title}
          </span>
        );
      },
    }),

    // Priority
    columnHelper.accessor("priority", {
      header: "Priority",
      size: 120,
      cell: ({ row }) => {
        const p = PRIORITY_CONFIG[row.original.priority || "medium"];
        return (
          <select
            value={row.original.priority || "medium"}
            onChange={(e) => handlePriority(row.original, e.target.value)}
            className={`text-xs px-2 py-1 rounded-lg border-0 outline-none cursor-pointer font-medium ${p.bg} ${p.color}`}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        );
      },
    }),

    // Status badge
    columnHelper.accessor("status", {
      id: "statusBadge",
      header: "Status",
      size: 120,
      cell: ({ row }) => (
        <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
          row.original.status === "completed"
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"
            : "bg-amber-50 dark:bg-amber-900/20 text-amber-600"
        }`}>
          {row.original.status === "completed" ? "Completed" : "Pending"}
        </span>
      ),
    }),

    // Due date
    columnHelper.accessor("due_date", {
      header: "Due Date",
      size: 140,
      cell: ({ row }) => {
        const isEditing = editingCell?.rowId === row.id && editingCell?.field === "due_date";
        return isEditing ? (
          <input
            autoFocus
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveEdit(row.original)}
            className="text-xs bg-transparent border-b border-indigo-400 outline-none text-gray-800 dark:text-gray-100"
          />
        ) : (
          <span
            onClick={() => startEdit(row.id, "due_date", row.original.due_date?.split("T")[0] || "")}
            className={`text-xs cursor-pointer ${
              isOverdue(row.original.due_date, row.original.status)
                ? "text-red-500 font-medium"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <span className="inline-flex items-center gap-1">
              {formatDate(row.original.due_date)}
              {isOverdue(row.original.due_date, row.original.status) && (
                <TriangleAlert className="w-3 h-3" />
              )}
            </span>
          </span>
        );
      },
    }),

    // Project
    columnHelper.accessor("project", {
      header: "Project",
      size: 130,
      cell: ({ row }) => (
        <span className="text-xs text-indigo-500 dark:text-indigo-400">
          {row.original.project || "—"}
        </span>
      ),
    }),

    // Created at
    columnHelper.accessor("created_at", {
      header: "Created",
      size: 120,
      cell: ({ row }) => (
        <span className="text-xs text-gray-400">
          {formatDate(row.original.created_at)}
        </span>
      ),
    }),

    // Delete
    columnHelper.display({
      id: "actions",
      header: "",
      size: 40,
      cell: ({ row }) => (
        <button
          onClick={() => handleDelete(row.original.id)}
          className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition text-sm opacity-0 group-hover/row:opacity-100"
        >
          <X className="w-4 h-4" />
        </button>
      ),
    }),
  ], [editingCell, editValue, handleDelete, handlePriority, handleToggle, saveEdit]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting, globalFilter: debouncedGlobalFilter },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="flex-1 p-4 md:p-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Table View</h2>
          <p className="text-gray-400 text-sm mt-1">
            {tasks.length} tasks • {completedCount} completed
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-xl pl-8 pr-4 py-2 text-sm outline-none focus:border-gray-400 shadow-sm w-48"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Head */}
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-gray-100 dark:border-gray-800">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="px-4 py-3 text-left"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          onClick={header.column.getToggleSortingHandler()}
                          className={`flex items-center gap-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider select-none ${
                            header.column.getCanSort() ? "cursor-pointer hover:text-gray-600 dark:hover:text-gray-300" : ""
                          }`}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === "asc" && " ↑"}
                          {header.column.getIsSorted() === "desc" && " ↓"}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {/* Body */}
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-16 text-gray-400 text-sm">
                    {searchInput ? `No results for "${searchInput}"` : "No tasks yet"}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group/row border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {tasks.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {table.getFilteredRowModel().rows.length} of {tasks.length} tasks
            </p>
            <p className="text-xs text-gray-400">
              Click a cell to edit • Click a header to sort
            </p>
          </div>
        )}
      </div>
    </div>
  );
}