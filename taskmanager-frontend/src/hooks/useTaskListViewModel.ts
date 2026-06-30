import { useMemo } from 'react';
import type { Task } from '../types/task';
import { getTaskEmptyState } from '../utils/taskEmptyState';
import {
  deriveVisibleTasks,
  type TaskFilterStatus,
  type TaskSortBy,
  type TaskViewTab,
} from '../utils/taskFiltering';
import { splitPriorityFilterValue } from '../utils/taskDisplayHelpers';
import { deriveTaskStatistics } from '../utils/taskStatistics';
import { isTaskDone, isTaskOverdue } from '../utils/taskUtils';

type UseTaskListViewModelOptions = {
  tasks: Task[];
  search: string;
  viewTab: TaskViewTab;
  filterStatus: TaskFilterStatus;
  filterProjectID: number | '';
  filterTagID: number | '';
  sortBy: TaskSortBy;
  calHideCompleted: boolean;
};

export default function useTaskListViewModel({
  tasks,
  search,
  viewTab,
  filterStatus,
  filterProjectID,
  filterTagID,
  sortBy,
  calHideCompleted,
}: UseTaskListViewModelOptions) {
  const { currentTaskCount, completedCount, overdueCount } = useMemo(() => {
    let currentTaskCount = 0;
    let completedCount = 0;
    let overdueCount = 0;
    for (const task of tasks) {
      if (isTaskDone(task)) completedCount += 1;
      else currentTaskCount += 1;
      if (isTaskOverdue(task)) overdueCount += 1;
    }
    return { currentTaskCount, completedCount, overdueCount };
  }, [tasks]);

  const tabTasks = useMemo(() => deriveVisibleTasks({
    tasks,
    search,
    viewTab,
    filterStatus,
    filterProjectID,
    filterTagID,
    sortBy,
  }), [tasks, search, viewTab, filterStatus, filterProjectID, filterTagID, sortBy]);

  const calTasks = useMemo(
    () => calHideCompleted ? tasks.filter(task => !isTaskDone(task)) : tasks,
    [tasks, calHideCompleted]
  );

  const statsData = useMemo(() => deriveTaskStatistics(tasks), [tasks]);
  const hasActiveListFilters =
    search.trim() !== '' ||
    filterStatus !== 'all' ||
    filterProjectID !== '' ||
    filterTagID !== '';
  const hasModifiedListControls = hasActiveListFilters || sortBy !== 'dueAsc';
  const emptyState = getTaskEmptyState({ search, filterStatus, hasActiveListFilters, viewTab });
  const { showFilterValue, priorityFilterValue } = splitPriorityFilterValue(filterStatus);

  return {
    currentTaskCount,
    completedCount,
    overdueCount,
    tabTasks,
    calTasks,
    statsData,
    hasActiveListFilters,
    hasModifiedListControls,
    emptyState,
    showFilterValue,
    priorityFilterValue,
  };
}
