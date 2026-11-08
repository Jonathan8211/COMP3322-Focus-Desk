import { Link } from 'react-router-dom';

export default function ChecklistProgress({ task }) {
  if (!task.checklist_total) return null;
  return <Link to={`/tasks/${task.id}`} className="text-xs text-indigo-600 hover:underline" aria-label={`Checklist for ${task.title}: ${task.checklist_done} of ${task.checklist_total} complete`}>
    Checklist {task.checklist_done}/{task.checklist_total}
  </Link>;
}
