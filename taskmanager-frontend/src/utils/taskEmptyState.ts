export type TaskEmptyStateInput = {
  search: string;
  filterStatus: string;
  hasActiveListFilters: boolean;
  viewTab: 'all' | 'today' | 'week' | 'month';
};

export type TaskEmptyState = {
  title: string;
  body: string;
};

export function getTaskEmptyState({ search, filterStatus, hasActiveListFilters, viewTab }: TaskEmptyStateInput): TaskEmptyState {
  if (search.trim() !== '') {
    return {
      title: 'No matching tasks',
      body: 'Try a different search term or reset the current filters.',
    };
  }
  if (filterStatus === 'completed') {
    return {
      title: 'No completed tasks yet',
      body: 'Completed tasks will show here.',
    };
  }
  if (filterStatus === 'overdue') {
    return {
      title: 'No overdue tasks',
      body: "You're all caught up.",
    };
  }
  if (hasActiveListFilters) {
    return {
      title: 'No tasks in this filter',
      body: 'Reset filters to bring the rest of your tasks back into view.',
    };
  }
  if (viewTab !== 'all') {
    return {
      title: `No tasks ${viewTab === 'today' ? 'today' : viewTab === 'week' ? 'this week' : 'this month'}`,
      body: 'Anything scheduled for this view will show up here.',
    };
  }
  return {
    title: 'No tasks yet',
    body: 'Swipe to Add and create your first task.',
  };
}
