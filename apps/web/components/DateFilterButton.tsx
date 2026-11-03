'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTaskStore } from '@/store/taskStore';
import { CalendarDays } from 'lucide-react';

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseRange(value: string | null) {
  if (!value) return { start: '', end: '' };
  const [start, end] = value.split('..');
  if (end !== undefined) return { start, end };
  return /^\d{4}-\d{2}-\d{2}$/.test(start) ? { start, end: start } : { start: '', end: '' };
}

function normalizeRange(start: string, end: string) {
  if (!start && !end) return null;
  const rangeStart = start || end;
  const rangeEnd = end || start;
  return rangeStart <= rangeEnd ? `${rangeStart}..${rangeEnd}` : `${rangeEnd}..${rangeStart}`;
}

function getDateFilterLabel(value: string | null) {
  if (!value) return '日期';
  const { start, end } = parseRange(value);
  if (start && end) return start === end ? start : `${start} ~ ${end}`;
  return value;
}

export default function DateFilterButton() {
  const { dateFilter, setDateFilter } = useTaskStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties | null>(null);

  const initialRange = parseRange(dateFilter);
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dropdownWidth = 260;
      const left = Math.min(rect.left, window.innerWidth - dropdownWidth - 12);
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: Math.max(12, left),
        zIndex: 1000,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    const range = parseRange(dateFilter);
    setStartDate(range.start);
    setEndDate(range.end);
  }, [dateFilter]);

  const handleApply = () => {
    setDateFilter(normalizeRange(startDate, endDate));
    setOpen(false);
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    setDateFilter(null);
    setOpen(false);
  };

  const handleToday = () => {
    const today = formatLocalDate(new Date());
    setStartDate(today);
    setEndDate(today);
  };

  const handleThisWeek = () => {
    const today = new Date();
    const day = today.getDay() || 7;
    const start = new Date(today);
    start.setDate(today.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    setStartDate(formatLocalDate(start));
    setEndDate(formatLocalDate(end));
  };

  const handleThisMonth = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setStartDate(formatLocalDate(start));
    setEndDate(formatLocalDate(end));
  };

  const label = getDateFilterLabel(dateFilter);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className={`filter-tab ${dateFilter ? 'active' : ''}`}
        title={dateFilter ? `日期筛选: ${dateFilter}` : '按日期筛选'}
      >
        <span className="icon-label"><CalendarDays size={14} />{label}</span>
      </button>

      {open && dropdownStyle && createPortal(
        <div ref={dropdownRef} className="date-filter-dropdown" style={dropdownStyle}>
          <div className="date-filter-row">
            <label>
              <span>开始</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label>
              <span>结束</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>
          <div className="date-filter-actions">
            <button onClick={handleThisWeek}>本周</button>
            <button onClick={handleThisMonth}>本月</button>
            <button onClick={handleClear}>清除</button>
            <button onClick={handleApply}>应用</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
