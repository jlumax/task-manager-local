export type Priority = 'high' | 'medium' | 'low';

export interface ProgressItem {
  content: string;
  time: string;
  images?: string[];
}

export interface Task {
  id: string;
  code: string;
  title: string;
  completed: boolean;
  stuck: boolean;
  stuckAt: string | null;
  pinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
  completedAt: string | null;
  startDate: string | null;
  progress: ProgressItem[];
  deadline: string | null;
  priority: Priority;
  projectId: string | null;
  workspaceId?: string;
}

export type FilterType = 'all' | 'active' | 'completed' | 'stuck' | 'high' | 'overdue';

export type GanttMode = 'week' | 'month';

export type GanttFilter = 'all' | 'active' | 'completed' | 'overdue';

export type ViewType = 'list' | 'gantt' | 'notes';

export type ThemeType =
  | 'default'
  | 'starry'
  | 'morandi'
  | 'morandi-green'
  | 'morandi-blue'
  | 'morandi-multi'
  | 'rage'
  | 'success'
  | 'custom';

export interface CustomThemePalette {
  dominant: string;
  foreground: string;
  card: string;
  cardForeground: string;
  border: string;
  primary: string;
  primaryForeground: string;
  muted: string;
  accent: string;
  overlay: string;
}

export type FontFamily = 'noto-sans' | 'wenkai' | 'longcang' | 'zen-old-mincho' | 'klee-one' | 'system';

export type ProjectColor = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'cyan' | 'pink' | 'gray';

export interface Project {
  id: string;
  name: string;
  color: ProjectColor;
  order: number;
  archived: boolean;
  workspaceId: string;
  createdAt: string;
}

export interface AppState {
  tasks: Task[];
  currentFilter: FilterType;
  searchTerm: string;
  currentView: ViewType;
  completedTasksCollapsed: boolean;
  stuckTasksCollapsed: boolean;
  ganttMode: GanttMode;
  ganttOffset: number;
  ganttFilter: GanttFilter;
  theme: ThemeType;
  fontFamily: FontFamily;
  effectsEnabled: boolean;
  appTitle: string;
  appSubtitle: string;
}
