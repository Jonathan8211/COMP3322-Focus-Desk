import { useCallback, useEffect, useRef, useState } from 'react';
import { getTasks, getTaskStats } from '../services/api';
import { useAuth } from './useAuth';
import { TasksContext } from './tasks-context';

const emptyStats = { total: 0, pending: 0, completed: 0, overdue: 0, completionRate: 0 };

export function TasksProvider({ children }) {
  const { user } = useAuth();
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

  return <TasksContext.Provider value={{ tasks, stats, loading, error, loadAllTasks }}>{children}</TasksContext.Provider>;
}
