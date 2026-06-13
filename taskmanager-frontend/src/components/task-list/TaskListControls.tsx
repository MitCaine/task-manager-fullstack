import { useState } from 'react';
import type { RefObject } from 'react';
import type { Project, Tag } from '../../types/task';
import SearchableCatalogList from '../shared/SearchableCatalogList';

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

type FilterDropdownProps<T extends string | number> = {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
};

function FilterDropdown<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: FilterDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(option => option.value === value)?.label ?? '';

  return (
    <div
      className="filter-field tag-select"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <span className="filter-field__label">{label}</span>
      <button
        type="button"
        className={`select select--sm filter-field__select tag-select__btn${open ? ' tag-select__btn--active' : ''}`}
        aria-label={`${label} filter: ${selectedLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        {selectedLabel}
      </button>
      {open && (
        <div className="tag-select__dropdown filter-field__dropdown" role="menu" aria-label={`${label} options`}>
          {options.map(option => (
            <button
              key={String(option.value)}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === value}
              className={`tag-select__item${option.value === value ? ' tag-select__item--on' : ''}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TagFilterDropdown({
  value,
  tags,
  onChange,
}: {
  value: number | '';
  tags: Tag[];
  onChange: (tagID: number | '') => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = tags.find(tag => tag.tagID === value)?.title ?? 'All';

  return (
    <div
      className="filter-field tag-select"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <span className="filter-field__label">Tag</span>
      <button
        type="button"
        className={`select select--sm filter-field__select tag-select__btn${open ? ' tag-select__btn--active' : ''}`}
        aria-label={`Tag filter: ${selectedLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        {selectedLabel}
      </button>
      {open && (
        <div className="tag-select__dropdown filter-field__dropdown" role="menu" aria-label="Tag options">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={value === ''}
            className={`tag-select__item${value === '' ? ' tag-select__item--on' : ''}`}
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            All
          </button>
          <SearchableCatalogList
            items={tags}
            searchLabel="Search tag filters"
            searchPlaceholder="Search tags..."
            emptyMessage="No tags yet."
            noMatchesMessage="No tags match your search."
            renderItem={tag => (
              <button
                key={tag.tagID}
                type="button"
                role="menuitemradio"
                aria-checked={tag.tagID === value}
                className={`tag-select__item${tag.tagID === value ? ' tag-select__item--on' : ''}`}
                onClick={() => {
                  onChange(tag.tagID);
                  setOpen(false);
                }}
              >
                <span className="tag-dot" style={{ background: tag.color ?? '#6366f1' }} />
                {tag.title}
              </button>
            )}
          />
        </div>
      )}
    </div>
  );
}

function ProjectFilterDropdown({
  value,
  projects,
  onChange,
}: {
  value: number | '';
  projects: Project[];
  onChange: (projectID: number | '') => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = projects.find(project => project.projectID === value)?.title ?? 'All';

  return (
    <div
      className="filter-field tag-select"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <span className="filter-field__label">Project</span>
      <button
        type="button"
        className={`select select--sm filter-field__select tag-select__btn${open ? ' tag-select__btn--active' : ''}`}
        aria-label={`Project filter: ${selectedLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        {selectedLabel}
      </button>
      {open && (
        <div className="tag-select__dropdown filter-field__dropdown" role="menu" aria-label="Project options">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={value === ''}
            className={`tag-select__item${value === '' ? ' tag-select__item--on' : ''}`}
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            All
          </button>
          <SearchableCatalogList
            items={projects}
            searchLabel="Search project filters"
            searchPlaceholder="Search projects..."
            emptyMessage="No projects yet."
            noMatchesMessage="No projects match your search."
            renderItem={project => (
              <button
                key={project.projectID}
                type="button"
                role="menuitemradio"
                aria-checked={project.projectID === value}
                className={`tag-select__item${project.projectID === value ? ' tag-select__item--on' : ''}`}
                onClick={() => {
                  onChange(project.projectID);
                  setOpen(false);
                }}
              >
                {project.title}
              </button>
            )}
          />
        </div>
      )}
    </div>
  );
}

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
          <FilterDropdown
            label="Sort"
            value={sortBy}
            options={[
              { value: 'dueAsc', label: 'Date ↑' },
              { value: 'dueDesc', label: 'Date ↓' },
              { value: 'titleAsc', label: 'A-Z' },
              { value: 'priorityDesc', label: 'Priority' },
              { value: 'overdueFirst', label: 'Overdue first' },
            ]}
            onChange={onSortByChange}
          />
          <FilterDropdown
            label="Show"
            value={showFilterValue}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Done' },
              { value: 'overdue', label: 'Overdue' },
            ]}
            onChange={onFilterStatusChange}
          />
          <FilterDropdown
            label="Priority"
            value={priorityFilterValue}
            options={[
              { value: 'all', label: 'All' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
            onChange={onFilterStatusChange}
          />
        </div>
        <div className="list-controls__row list-controls__row--secondary">
          <ProjectFilterDropdown
            value={filterProjectID}
            projects={projects}
            onChange={onFilterProjectChange}
          />
          <TagFilterDropdown
            value={filterTagID}
            tags={tags}
            onChange={onFilterTagChange}
          />
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
