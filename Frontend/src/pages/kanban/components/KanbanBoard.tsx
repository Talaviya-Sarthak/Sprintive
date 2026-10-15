import KanbanColumn from './KanbanColumn';
import { KANBAN_COLUMNS } from '../data/mockKanbanData';
import type { KanbanTask, KanbanStatus } from '../types';

interface KanbanBoardProps {
  tasks: KanbanTask[];
  onAddTask: (status: KanbanStatus) => void;
  onCardClick: (task: KanbanTask) => void;
  onMoveStatus: (taskId: string, newStatus: KanbanStatus) => void;
}

export default function KanbanBoard({
  tasks,
  onAddTask,
  onCardClick,
  onMoveStatus,
}: KanbanBoardProps) {
  return (
    <div className="w-full flex-1 min-h-0 overflow-x-auto app-scrollbar pb-4">
      <div className="flex items-start gap-2.5 sm:gap-3 min-w-max h-full">
        {KANBAN_COLUMNS.map(column => {
          const columnTasks = tasks.filter(t => t.status === column.id);
          return (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={columnTasks}
              onAddTask={onAddTask}
              onCardClick={onCardClick}
              onMoveStatus={onMoveStatus}
            />
          );
        })}
      </div>
    </div>
  );
}
