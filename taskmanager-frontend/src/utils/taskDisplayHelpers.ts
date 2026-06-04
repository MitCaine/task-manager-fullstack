import type { Project, Tag } from '../types/task';
import { formatDate, formatTime, parseLocalDateTime } from './dateTime';

export function formatPriorityLabel(priority: string): string {
  return priority[0] + priority.slice(1).toLowerCase();
}

export function splitPriorityFilterValue<T extends string>(filterStatus: T): { showFilterValue: T | 'all'; priorityFilterValue: T | 'all' } {
  const isPriorityFilter = filterStatus === 'high' || filterStatus === 'medium' || filterStatus === 'low';
  return {
    showFilterValue: isPriorityFilter ? 'all' : filterStatus,
    priorityFilterValue: isPriorityFilter ? filterStatus : 'all',
  };
}

export function findProjectById(projects: Project[], projectID: number | string | null | undefined): Project | null {
  if (projectID === '' || projectID == null) return null;
  return projects.find(project => Number(project.projectID) === Number(projectID)) ?? null;
}

export function findTagsByIds(tags: Tag[], tagIDs: number[]): Tag[] {
  return tags.filter(tag => tagIDs.includes(tag.tagID));
}

export function formatTaskDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  locale: string,
  is24Hour: boolean,
): string {
  const formatDateOrFallback = (dt: string | null | undefined) => formatDate(dt, locale, is24Hour) || 'No due date';
  if (!start) return 'No due date';
  if (!end) return formatDateOrFallback(start);
  const startDate = parseLocalDateTime(start);
  const endDate = parseLocalDateTime(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return formatDateOrFallback(start);
  const startLabel = formatDate(start, locale, is24Hour);
  const sameDay = startDate.toDateString() === endDate.toDateString();
  const endLabel = sameDay
    ? formatTime(end, is24Hour)
    : formatDate(end, locale, is24Hour);
  return `${startLabel} - ${endLabel}`;
}

export function formatCreateDateDisplayLabel(date: string, locale: string, is24Hour: boolean): string {
  return date ? formatDate(`${date}T00:00:00`, locale, is24Hour) : 'Select date';
}
