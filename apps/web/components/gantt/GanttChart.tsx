'use client';

import { useMemo, useRef, useEffect } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import { useTaskStore } from '@/store/taskStore';
import { formatDate } from '@/lib/utils';
import { GanttFilter, GanttMode } from '@/types';
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';

function getDateRange(mode: GanttMode, offset: number): Date[] {
  const todayObj = new Date();
  const today = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
  const dates: Date[] = [];

  if (mode === 'week') {
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset * 7 + daysToMonday);
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + i);
      dates.push(d);
    }
  } else {
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    for (let i = 0; i < daysInMonth; i++) {
      const d = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1 + i);
      dates.push(d);
    }
  }

  return dates;
}

export default function GanttChart() {
  const {
    tasks,
    ganttMode,
    ganttOffset,
    ganttFilter,
    currentProjectId,
    currentWorkspaceId,
    setGanttMode,
    changeGanttRange,
    setGanttFilter,
    setCurrentView,
    setHighlightTaskId,
    setExpandedTaskId,
    highlightTaskId,
  } = useTaskStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const dates = useMemo(() => getDateRange(ganttMode, ganttOffset), [ganttMode, ganttOffset]);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const rangeLabel = useMemo(() => {
    if (ganttMode === 'week') {
      return `${formatDate(dates[0])} ~ ${formatDate(dates[6])}`;
    }
    return `${formatDate(dates[0])} ~ ${formatDate(dates[dates.length - 1])}`;
  }, [dates, ganttMode]);

  interface BarSegment {
    barStart: number;
    barEnd: number;
    className: string;
  }

  const chartTasks = useMemo(() => {
    const getBarPos = (startDate: Date, endDate: Date): BarSegment | null => {
      let barStart = -1;
      let barEnd = -1;
      for (let i = 0; i < dates.length; i++) {
        const currentDate = new Date(dates[i].getFullYear(), dates[i].getMonth(), dates[i].getDate());
        if (barStart === -1 && currentDate.getTime() >= startDate.getTime()) {
          barStart = i;
        }
        if (currentDate.getTime() <= endDate.getTime()) {
          barEnd = i;
        } else if (barEnd === -1 && currentDate.getTime() > endDate.getTime()) {
          barEnd = -1;
        }
      }
      if (barStart === -1 || barEnd === -1 || barEnd < barStart) return null;
      return { barStart, barEnd, className: '' };
    };

    let filtered = tasks;

    if (currentWorkspaceId) {
      filtered = filtered.filter((t) => t.workspaceId === currentWorkspaceId);
    }

    switch (ganttFilter) {
      case 'active':
        filtered = filtered.filter((t) => !t.completed && !t.stuck);
        break;
      case 'completed':
        filtered = filtered.filter((t) => t.completed && !t.stuck);
        break;
      case 'overdue':
        filtered = filtered.filter((t) => {
          if (t.completed || !t.deadline) return false;
          const parts = t.deadline.split('-');
          const deadline = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          return deadline < today;
        });
        break;
    }

    if (currentProjectId) {
      filtered = filtered.filter((t) => t.projectId === currentProjectId);
    }

    return filtered
      .map((task) => {
        const startDateObj = new Date(task.startDate || task.createdAt);
        const createdDate = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());

        let deadlineDate: Date | null = null;
        if (task.deadline) {
          const parts = task.deadline.split('-');
          deadlineDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        }

        let completedDate: Date | null = null;
        if (task.completed && task.completedAt) {
          completedDate = new Date(task.completedAt);
          completedDate.setHours(0, 0, 0, 0);
        }

        const segments: BarSegment[] = [];

        const startsInFuture = createdDate.getTime() > today.getTime();

        if (!deadlineDate) {
          if (startsInFuture && !task.completed) {
            const pos = getBarPos(createdDate, createdDate);
            if (pos) {
              pos.className = 'planned';
              segments.push(pos);
            }
          } else {
            const end = task.completed && completedDate ? completedDate : today;
            const pos = getBarPos(createdDate, end);
            if (pos) {
              pos.className = task.completed ? 'completed' : 'active';
              segments.push(pos);
            }
          }
        } else if (task.completed && completedDate) {
          if (completedDate.getTime() <= deadlineDate.getTime()) {
            const pos = getBarPos(createdDate, completedDate);
            if (pos) {
              pos.className = 'completed';
              segments.push(pos);
            }
            const nextDayAfterComplete = new Date(completedDate);
            nextDayAfterComplete.setDate(nextDayAfterComplete.getDate() + 1);
            if (nextDayAfterComplete.getTime() <= deadlineDate.getTime()) {
              const pos2 = getBarPos(nextDayAfterComplete, deadlineDate);
              if (pos2) {
                pos2.className = 'ahead';
                segments.push(pos2);
              }
            }
          } else {
            const seg1 = getBarPos(createdDate, deadlineDate);
            if (seg1) {
              seg1.className = 'active';
              segments.push(seg1);
            }
            const nextDay = new Date(deadlineDate);
            nextDay.setDate(nextDay.getDate() + 1);
            const seg2 = getBarPos(nextDay, completedDate);
            if (seg2) {
              seg2.className = 'overdue';
              segments.push(seg2);
            }
          }
        } else if (startsInFuture) {
          const pos = getBarPos(createdDate, deadlineDate);
          if (pos) {
            pos.className = 'planned';
            segments.push(pos);
          }
        } else {
          if (today.getTime() <= deadlineDate.getTime()) {
            const pos = getBarPos(createdDate, today);
            if (pos) {
              pos.className = 'active';
              segments.push(pos);
            }
            const nextDay2 = new Date(today);
            nextDay2.setDate(nextDay2.getDate() + 1);
            if (nextDay2.getTime() <= deadlineDate.getTime()) {
              const pos2 = getBarPos(nextDay2, deadlineDate);
              if (pos2) {
                pos2.className = 'planned';
                segments.push(pos2);
              }
            }
          } else {
            const seg1 = getBarPos(createdDate, deadlineDate);
            if (seg1) {
              seg1.className = 'active';
              segments.push(seg1);
            }
            const nextDay = new Date(deadlineDate);
            nextDay.setDate(nextDay.getDate() + 1);
            const seg2 = getBarPos(nextDay, today);
            if (seg2) {
              seg2.className = 'overdue';
              segments.push(seg2);
            }
          }
        }

        if (segments.length === 0) return null;
        return { task, segments };
      })
      .filter(Boolean) as { task: (typeof tasks)[0]; segments: BarSegment[] }[];
  }, [tasks, ganttFilter, currentProjectId, currentWorkspaceId, dates, today]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let todayIndex = -1;
    for (let i = 0; i < dates.length; i++) {
      if (dates[i].getTime() === today.getTime()) {
        todayIndex = i;
        break;
      }
    }
    let targetIndex = todayIndex - 7;
    if (targetIndex < 0) targetIndex = 0;
    el.scrollLeft = targetIndex * 40;
  }, [dates, today]);

  useEffect(() => {
    if (!highlightTaskId) return;
    const els = document.querySelectorAll(`[data-task-id="${highlightTaskId}"]`);
    if (els.length > 0) {
      els[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      els.forEach((el) => el.classList.add('gantt-task-highlight'));
      const timer = setTimeout(() => {
        els.forEach((el) => el.classList.remove('gantt-task-highlight'));
        setHighlightTaskId(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [highlightTaskId, setHighlightTaskId]);

  const scrollToTask = (taskId: string) => {
    setCurrentView('list');
    setExpandedTaskId(taskId);
    setHighlightTaskId(taskId);
    setTimeout(() => setHighlightTaskId(null), 1500);
  };

  const scrollToNotes = (taskId: string) => {
    setCurrentView('notes');
    setHighlightTaskId(taskId);
    setTimeout(() => setHighlightTaskId(null), 1500);
  };

  const isFixedWidth = dates.length > 7;
  const fixedWidthStyle = isFixedWidth ? `${dates.length * 40}px` : '100%';

  return (
    <section className="gantt-container">
      <div className="gantt-header" style={{ flexWrap: 'nowrap' as const }}>
        <h2 className="icon-heading"><BarChart3 size={20} />任务甘特图</h2>
        <div className="gantt-filter-tabs">
          {(['all', 'active', 'completed', 'overdue'] as GanttFilter[]).map((f) => {
            const labelMap: Record<GanttFilter, string> = {
              all: '全部',
              active: '进行中',
              completed: '已完成',
              overdue: '已逾期',
            };
            return (
              <button
                key={f}
                className={`gantt-filter-tab ${ganttFilter === f ? 'active' : ''}`}
                data-gantt-filter={f}
                onClick={() => setGanttFilter(f)}
                style={{ whiteSpace: 'nowrap' as const }}
              >
                {labelMap[f]}
              </button>
            );
          })}
        </div>
        <div className="gantt-nav">
          <button className="gantt-nav-arrow" onClick={() => changeGanttRange(-1)}>
            <ChevronLeft size={15} />
          </button>
          <span id="ganttRangeLabel">{rangeLabel}</span>
          <button className="gantt-nav-arrow" onClick={() => changeGanttRange(1)}>
            <ChevronRight size={15} />
          </button>
          <button onClick={() => setGanttMode(ganttMode === 'week' ? 'month' : 'week')} style={{ whiteSpace: 'nowrap' as const }}>
            {ganttMode === 'week' ? '切换到月视图' : '切换到周视图'}
          </button>
        </div>
      </div>

      <div className="gantt-chart">
        {chartTasks.length === 0 ? (
          <EmptyState title="暂无可排期任务" hint="创建任务并设置开始日期后，将在此显示时间线" />
        ) : (
          <div className="gantt-chart-wrapper">
            <div className="gantt-left-column">
              <div className="gantt-task-name-header">任务名称</div>
              <div className="gantt-task-names">
                {chartTasks.map(({ task }) => {
                  const priorityDotClass = task.priority || 'medium';
                  return (
                    <div key={task.id} className="gantt-task-name" data-task-id={task.id}>
                      <span className={`gantt-priority-dot ${priorityDotClass}`} />
                      <span onClick={() => scrollToTask(task.id)} style={{ cursor: 'pointer' }}>
                        {task.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="gantt-right-column" ref={scrollRef}>
              <div className="gantt-timeline" style={{ width: fixedWidthStyle }}>
                <div className="gantt-dates" style={{ width: fixedWidthStyle }}>
                  {dates.map((d, i) => {
                    const isToday = d.getTime() === today.getTime();
                    const dateStyle = isFixedWidth ? { width: '40px', flexShrink: 0 as const } : undefined;
                    return (
                      <div
                        key={i}
                        className={`gantt-date ${isToday ? 'today' : ''}`}
                        style={dateStyle}
                      >
                        {d.getMonth() + 1}/{d.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="gantt-bars-wrapper" style={{ width: fixedWidthStyle }}>
                {chartTasks.map(({ task, segments }) => {
                  const barsContainerStyle = isFixedWidth ? { width: fixedWidthStyle } : {};
                  return (
                    <div key={task.id} className="gantt-bars" style={barsContainerStyle} data-task-id={task.id}>
                      {segments.map((seg, idx) => {
                        const barWidth = seg.barEnd - seg.barStart + 1;
                        const leftPercent = (seg.barStart / dates.length) * 100;
                        const widthPercent = (barWidth / dates.length) * 100;
                        const first = idx === 0;
                        const last = idx === segments.length - 1;
                        return (
                          <div
                            key={idx}
                            className={`gantt-bar ${seg.className}`}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              borderTopLeftRadius: first ? '10px' : '0',
                              borderBottomLeftRadius: first ? '10px' : '0',
                              borderTopRightRadius: last ? '10px' : '0',
                              borderBottomRightRadius: last ? '10px' : '0',
                            }}
                            title={task.title}
                            onClick={() => scrollToNotes(task.id)}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
