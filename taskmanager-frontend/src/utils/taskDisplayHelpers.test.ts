import { findProjectById, findTagsByIds, formatCreateDateDisplayLabel, formatPriorityLabel, formatTaskDateRange, splitPriorityFilterValue } from './taskDisplayHelpers';
import type { Project, Tag } from '../types/task';

const projects: Project[] = [
  { projectID: 1, title: 'Home'},
  { projectID: 2, title: 'Work'},
];
const tags: Tag[] = [
  { tagID: 1, title: 'Urgent', color: '#f00' },
  { tagID: 2, title: 'Later', color: '#0f0' },
];

describe('taskDisplayHelpers', () => {
  it('formats priority labels', () => {
    expect(formatPriorityLabel('HIGH')).toBe('High');
    expect(formatPriorityLabel('MEDIUM')).toBe('Medium');
  });

  it('splits priority filters from status filters', () => {
    expect(splitPriorityFilterValue('high')).toEqual({ showFilterValue: 'all', priorityFilterValue: 'high' });
    expect(splitPriorityFilterValue('completed')).toEqual({ showFilterValue: 'completed', priorityFilterValue: 'all' });
  });

  it('finds projects and tags by ids', () => {
    expect(findProjectById(projects, '2')?.title).toBe('Work');
    expect(findProjectById(projects, '')).toBeNull();
    expect(findTagsByIds(tags, [2]).map(tag => tag.title)).toEqual(['Later']);
  });

  it('formats create date display labels', () => {
    expect(formatCreateDateDisplayLabel('', 'en-US', false)).toBe('Select date');
    expect(formatCreateDateDisplayLabel('2026-06-03', 'en-US', false)).toBe('06/03/2026');
  });

  it('formats task date ranges', () => {
    expect(formatTaskDateRange(null, null, 'en-US', false)).toBe('No due date');
    expect(formatTaskDateRange('2026-06-03T09:00:00', '2026-06-03T10:30:00', 'en-US', false)).toContain('10:30 AM');
  });
});
