'use client';

import { useMemo, useState } from 'react';
import { useTaskStore } from '@/store/taskStore';
import TaskItem from './TaskItem';
import EmptyState from '@/components/ui/EmptyState';
import DateFilterButton from '@/components/DateFilterButton';
import { TaskDetailModal } from './TaskDetailModal';
import { FilterType } from '@/types';
import { ListTodo } from 'lucide-react';

const filterLabels: Record<FilterType, string> = {
  all: '全部',
  active: '进行中',
  completed: '已完成',
  stuck: '僵持中',
  high: '高优先级',
  overdue: '已逾期',
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TaskList() {
  const {
    getFilteredTasks,
    getStats,
    currentFilter,
    setFilter,
    completedTasksCollapsed,
    stuckTasksCollapsed,
    toggleCompletedTasks,
    toggleStuckTasks,
    searchTerm,
    highlightTaskId,
    dateFilter,
    setDateFilter,
    tasks: allTasks,
  } = useTaskStore();

  const tasks = getFilteredTasks();
  const stats = getStats();
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);
  const modalTask = useMemo(() => allTasks.find((t) => t.id === modalTaskId), [allTasks, modalTaskId]);

  const activeTasks = tasks.filter((t) => !t.completed && !t.stuck);
  const stuckTasks = tasks.filter((t) => t.stuck);
  const completedTasks = tasks.filter((t) => t.completed && !t.stuck);
  const todayFilter = useMemo(() => {
    const today = formatLocalDate(new Date());
    return `${today}..${today}`;
  }, []);

  return (
    <div className="tasks-container">
      <div className="tasks-header">
        <h2 className="icon-heading"><ListTodo size={20} />任务列表</h2>
        <div className="filter-tabs">
        {(['all', 'active', 'completed', 'stuck', 'high', 'overdue'] as FilterType[]).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-tab ${currentFilter === f ? 'active' : ''}`}
            >
              {filterLabels[f]}
              <span className="count">
                {f === 'all' && stats.total}
                {f === 'active' && stats.active}
                {f === 'completed' && stats.completed}
                {f === 'stuck' && stats.stuck}
                {f === 'high' && stats.high}
                {f === 'overdue' && stats.overdue}
              </span>
            </button>
          )
        )}
        <button
          onClick={() => setDateFilter(dateFilter === todayFilter ? null : todayFilter)}
          className={`filter-tab ${dateFilter === todayFilter ? 'active' : ''}`}
          title="筛选今日任务"
        >
          今日
        </button>
        <DateFilterButton />
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState searchTerm={searchTerm} />
      ) : (
        <ul className="task-list" id="taskList">
          {activeTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              searchTerm={searchTerm}
              highlight={highlightTaskId === task.id}
              onClickDetail={() => setModalTaskId(task.id)}
            />
          ))}

          {stuckTasks.length > 0 && (
            <li
              className="stuck-divider"
              onClick={toggleStuckTasks}
            >
              <span className={`divider-triangle ${stuckTasksCollapsed ? 'collapsed' : ''}`} />
              <span className="divider-text">
                僵持中任务 ({stuckTasks.length})
              </span>
            </li>
          )}

          {!stuckTasksCollapsed &&
            stuckTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                searchTerm={searchTerm}
                highlight={highlightTaskId === task.id}
                onClickDetail={() => setModalTaskId(task.id)}
              />
            ))}

          {completedTasks.length > 0 && (
            <li
              className="completed-divider"
              onClick={toggleCompletedTasks}
            >
              <span className={`divider-triangle ${completedTasksCollapsed ? 'collapsed' : ''}`} />
              <span className="divider-text">
                已完成任务 ({completedTasks.length})
              </span>
            </li>
          )}

          {!completedTasksCollapsed &&
            completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                searchTerm={searchTerm}
                highlight={highlightTaskId === task.id}
                onClickDetail={() => setModalTaskId(task.id)}
              />
            ))}
        </ul>
      )}

      {modalTask && (
        <TaskDetailModal
          task={modalTask}
          searchTerm={searchTerm}
          onClose={() => setModalTaskId(null)}
          onNavigateTask={setModalTaskId}
        />
      )}
    </div>
  );
}
