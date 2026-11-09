import { useCallback, useEffect, useRef, useState } from 'react';
import { getTasks, getTaskStats, createTask, updateTask, deleteTask } from '../services/api';
import { useAuth } from './useAuth';
import { TasksContext } from './tasks-context';
import { useTheme } from './useTheme';

const emptyStats = { total: 0, pending: 0, completed: 0, overdue: 0, completionRate: 0 };

export function TasksProvider({ children }) {
  const { user } = useAuth();
  const { celebrate } = useTheme();
  const userId = user?.id;
  const requestId = useRef(0);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAllTasks = useCallback(async () => {
    if (!userId) return { success: false, message: 'Sign in required.' };
    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      const first = await getTasks({ page: 1, limit: 100 });
      if (!first.success) throw new Error(first.message || 'Could not load tasks.');
      const all = [...first.data];
      const totalPages = first.pagination?.totalPages || 1;
      for (let page = 2; page <= totalPages; page += 1) {
        const next = await getTasks({ page, limit: 100 });
        if (!next.success) throw new Error(next.message || 'Could not load all tasks.');
        all.push(...next.data);
      }
      const summary = await getTaskStats();
      if (!summary.success) throw new Error(summary.message || 'Could not load task statistics.');
      if (currentRequest === requestId.current) {
        setTasks([...new Map(all.map((task) => [task.id, task])).values()]);
        setStats(summary.data);
        setError('');
      }
      return { success: true };
    } catch (loadError) {
      if (currentRequest === requestId.current) setError(loadError.message);
      return { success: false, message: loadError.message };
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [userId]);

  const mutateTask = useCallback(async (operation) => {
    const result = await operation();
    if (!result.success) return result;
    const refreshed = await loadAllTasks();
    return refreshed.success ? result : {
      success: false,
      changed: true,
      message: `Task changed, but the latest tasks could not be loaded. ${refreshed.message}`,
    };
  }, [loadAllTasks]);

  const addTask = useCallback((data) => mutateTask(() => createTask(data)), [mutateTask]);
  const changeTask = useCallback(async (id, data, options = {}) => {
    const task = tasks.find((item) => item.id === Number(id));
    const finishing = data.status === 'completed' || data.kanban_status === 'done';
    if (!options.skipChecklistPrompt && finishing && task?.status !== 'completed' && task?.checklist_total > task?.checklist_done &&
      !window.confirm('This task has unfinished checklist items. Complete it anyway?')) {
      return { success: false, cancelled: true };
    }
    const result = await mutateTask(() => updateTask(id, data));
    if (finishing && task?.status !== 'completed' && (result.success || result.changed)) celebrate();
    return result;
  }, [celebrate, mutateTask, tasks]);
  const removeTask = useCallback((id) => mutateTask(() => deleteTask(id)), [mutateTask]);

  useEffect(() => {
    let active = true;
    if (userId) {
      Promise.resolve().then(() => { if (active) loadAllTasks(); });
    } else {
      requestId.current += 1;
      Promise.resolve().then(() => {
        if (active) { setTasks([]); setStats(emptyStats); setError(''); setLoading(false); }
      });
    }
    return () => { active = false; requestId.current += 1; };
  }, [userId, loadAllTasks]);

  return <TasksContext.Provider value={{ tasks, stats, loading, error, loadAllTasks, addTask, changeTask, removeTask }}>{children}</TasksContext.Provider>;
}
