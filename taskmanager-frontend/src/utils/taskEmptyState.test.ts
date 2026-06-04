import { getTaskEmptyState } from './taskEmptyState';

describe('getTaskEmptyState', () => {
  it('prioritizes search empty state', () => {
    expect(getTaskEmptyState({ search: 'abc', filterStatus: 'completed', hasActiveListFilters: true, viewTab: 'all' }).title).toBe('No matching tasks');
  });

  it('returns completed and overdue states', () => {
    expect(getTaskEmptyState({ search: '', filterStatus: 'completed', hasActiveListFilters: false, viewTab: 'all' }).body).toBe('Completed tasks will show here.');
    expect(getTaskEmptyState({ search: '', filterStatus: 'overdue', hasActiveListFilters: false, viewTab: 'all' }).body).toBe("You're all caught up.");
  });

  it('returns active filter and tab-specific states', () => {
    expect(getTaskEmptyState({ search: '', filterStatus: 'all', hasActiveListFilters: true, viewTab: 'all' }).title).toBe('No tasks in this filter');
    expect(getTaskEmptyState({ search: '', filterStatus: 'all', hasActiveListFilters: false, viewTab: 'week' }).title).toBe('No tasks this week');
  });

  it('returns default empty state', () => {
    expect(getTaskEmptyState({ search: '', filterStatus: 'all', hasActiveListFilters: false, viewTab: 'all' }).title).toBe('No tasks yet');
  });
});
