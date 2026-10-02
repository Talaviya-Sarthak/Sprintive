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
  ticket_id?: string;
  title: string;
  description?: string;
  status: KanbanStatus;
  priority: TaskPriority;
  assignee?: TaskAssignee;
  assignee_id?: string;
  raw_assignee?: string;
  assignee_avatar?: string;
  assignee_role?: string;
  dueDate?: string;
  due_date?: string;
  resolved_due_date?: string;
  type?: 'task' | 'bug' | 'feature' | 'improvement';
  labels?: string[];
  source?: 'manual' | 'ai';
  source_action_item?: string;
  acceptance_criteria?: string[];
  meeting_id?: string;
  meeting_title?: string;
  meeting_date?: string;
  team_id?: string;
  createdAt?: string;
}

export interface KanbanMeeting {
  id: string;
  title: string;
  date?: string;
  task_count: number;
}

export interface KanbanData {
  team_id: string;
  meeting_id?: string | null;
  meetings: KanbanMeeting[];
  tasks: KanbanTask[];
  columns: Record<KanbanStatus, KanbanTask[]>;
  total_tasks: number;
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
