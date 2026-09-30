export type KanbanStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'done';

export type TaskPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

export interface TaskAssignee {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: KanbanStatus;
  priority: TaskPriority;
  assignee?: TaskAssignee;
  dueDate?: string;
  labels?: string[];
  source?: 'manual' | 'ai';
  createdAt?: string;
}

export interface KanbanColumnConfig {
  id: KanbanStatus;
  title: string;
  subtitle?: string;
  accentColor?: 'slate' | 'blue' | 'indigo' | 'amber' | 'emerald';
}

export type SortOption =
  | 'recent'
  | 'due-asc'
  | 'due-desc'
  | 'priority-desc'
  | 'priority-asc';
