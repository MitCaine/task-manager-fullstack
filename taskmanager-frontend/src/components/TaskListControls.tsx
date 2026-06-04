import type { RefObject } from 'react';
import type { Project, Tag } from '../types/task';

export type SortBy = 'dueAsc' | 'dueDesc' | 'titleAsc' | 'overdueFirst' | 'priorityDesc';
export type FilterStatus = 'all' | 'active' | 'completed' | 'overdue' | 'high' | 'medium' | 'low';
export type ViewTab = 'all' | 'today' | 'week' | 'month';

type TaskListControlsProps = {
  viewTab: ViewTab;
  onViewTabChange: (tab: ViewTab) => void;
  sortBy: SortBy;
  onSortByChange: (sortBy: SortBy) => void;
  showFilterValue: FilterStatus;
  priorityFilterValue: FilterStatus;
  filterStatus: FilterStatus;
  onFilterStatusChange: (status: FilterStatus) => void;
  filterProjectID: number | '';
  onFilterProjectChange: (projectID: number | '') => void;
  filterTagID: number | '';
  onFilterTagChange: (tagID: number | '') => void;
  projects: Project[];
  tags: Tag[];
  hasModifiedListControls: boolean;
  onResetFilters: () => void;
  search: string;
  onSearchChange: (search: string) => void;
  searchInputRef: RefObject<HTMLInputElement>;
  totalTaskCount: number;
  completedCount: number;
  overdueCount: number;
  bulkMode: boolean;
  selectedBulkCount: number;
  onToggleBulkMode: () => void;
  onBulkMarkDone: () => void;
  onBulkDelete: () => void;
};

function TaskListControls({
  viewTab,
  onViewTabChange,
  sortBy,
  onSortByChange,
  showFilterValue,
  priorityFilterValue,
  filterStatus,
  onFilterStatusChange,
  filterProjectID,
  onFilterProjectChange,
  filterTagID,
  onFilterTagChange,
  projects,
  tags,
  hasModifiedListControls,
  onResetFilters,
  search,
  onSearchChange,
  searchInputRef,
  totalTaskCount,
  completedCount,
  overdueCount,
  bulkMode,
  selectedBulkCount,
  onToggleBulkMode,
  onBulkMarkDone,
  onBulkDelete,
}: TaskListControlsProps) {
  return (
    <>
      <div className="view-tabs">
        {(['all', 'today', 'week', 'month'] as const).map(tab => (
          <button
            key={tab}
            className={`view-tab${viewTab === tab ? ' view-tab--active' : ''}`}
            onClick={() => onViewTabChange(tab)}
          >
            {tab === 'all' ? 'All' : tab === 'today' ? 'Today' : tab === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      <div className="list-controls list-controls--with-reset">
        <div className="list-controls__row list-controls__row--primary">
          <label className="filter-field">
            <span className="filter-field__label">Sort</span>
            <select className="select select--sm filter-field__select" value={sortBy} onChange={e => onSortByChange(e.target.value as SortBy)}>
              <option value="dueAsc">Date ↑</option>
              <option value="dueDesc">Date ↓</option>
              <option value="titleAsc">A-Z</option>
              <option value="priorityDesc">Priority</option>
              <option value="overdueFirst">Overdue first</option>
            </select>
          </label>
          <label className="filter-field">
            <span className="filter-field__label">Show</span>
            <select className="select select--sm filter-field__select" value={showFilterValue} onChange={e => onFilterStatusChange(e.target.value as FilterStatus)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Done</option>
              <option value="overdue">Overdue</option>
            </select>
          </label>
          <label className="filter-field">
            <span className="filter-field__label">Priority</span>
            <select className="select select--sm filter-field__select" value={priorityFilterValue} onChange={e => onFilterStatusChange(e.target.value as FilterStatus)}>
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>
        <div className="list-controls__row list-controls__row--secondary">
          <label className="filter-field">
            <span className="filter-field__label">Project</span>
            <select
              className="select select--sm filter-field__select"
              value={filterProjectID}
              onChange={e => onFilterProjectChange(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">All</option>
              {projects.map(p => (
                <option key={p.projectID} value={p.projectID}>{p.title}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span className="filter-field__label">Tag</span>
            <select
              className="select select--sm filter-field__select"
              value={filterTagID}
              onChange={e => onFilterTagChange(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">All</option>
              {tags.map(tag => (
                <option key={tag.tagID} value={tag.tagID}>{tag.title}</option>
              ))}
            </select>
          </label>
          <button
            className="btn btn--ghost btn--sm btn--reset-filters"
            onClick={onResetFilters}
            disabled={!hasModifiedListControls}
          >
            Reset Filters
          </button>
        </div>
      </div>

      <input
        ref={searchInputRef}
        className="input search mtop"
        type="text"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search tasks"
        aria-label="Search tasks"
      />

      <div className="spread mtop small task-overview">
        <div className="task-count-row">
          <button
            type="button"
            className={`task-count task-count--button${filterStatus === 'all' ? ' task-count--active' : ''}`}
            onClick={() => onFilterStatusChange('all')}
            aria-pressed={filterStatus === 'all'}
          >
            {totalTaskCount} task{totalTaskCount !== 1 ? 's' : ''}
          </button>
          {overdueCount > 0 && (
            <button
              type="button"
              className={`task-count task-count--button task-count--overdue${filterStatus === 'overdue' ? ' task-count--active' : ''}`}
              onClick={() => onFilterStatusChange('overdue')}
              aria-pressed={filterStatus === 'overdue'}
            >
              {overdueCount} overdue
            </button>
          )}
          {completedCount > 0 && (
            <button
              type="button"
              className={`footer-done task-count--button${filterStatus === 'completed' ? ' task-count--active' : ''}`}
              onClick={() => onFilterStatusChange('completed')}
              aria-pressed={filterStatus === 'completed'}
            >
              {completedCount} done
            </button>
          )}
        </div>
        <button
          className={`btn btn--ghost btn--sm${bulkMode ? ' btn--active' : ''}`}
          onClick={onToggleBulkMode}
        >
          {bulkMode ? 'Cancel' : 'Select'}
        </button>
      </div>

      {bulkMode && selectedBulkCount > 0 && (
        <div className="bulk-bar">
          <span className="bulk-bar__count">{selectedBulkCount} selected</span>
          <button className="btn btn--sm" onClick={onBulkMarkDone}>Mark done</button>
          <button className="btn btn--danger btn--sm" onClick={onBulkDelete}>Delete</button>
        </div>
      )}
    </>
  );
}

export default TaskListControls;
