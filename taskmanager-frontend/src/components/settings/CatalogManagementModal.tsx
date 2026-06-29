import { type KeyboardEvent, type TouchEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Project, Tag } from '../../types/task';
import { handleProxyFocusAssistTouchStart } from '../../utils/mobileFocusAssist';
import CatalogBulkCreateSection from './CatalogBulkCreateSection';
import CatalogManagerItemRow from './CatalogManagerItemRow';

type CatalogSection = 'projects' | 'tags';
type CatalogSortMode = 'name-asc' | 'usage-desc' | 'usage-asc';
type CatalogUsageFilter = 'all' | 'used' | 'unused';
type CatalogControlDropdown = 'sort' | 'filter';
type PendingDelete = { kind: CatalogSection; id: number; title: string; usageCount: number } | null;
type PendingBulkDelete = { kind: CatalogSection; ids: number[] } | null;
type CatalogDropdownOption<Value extends string> = { value: Value; label: string };

const normalizeCatalogTitle = (value: string) => value.trim().toLocaleLowerCase();
const compareCatalogTitles = (left: string, right: string) => left.localeCompare(right, undefined, { sensitivity: 'base' });
const formatDuplicateSummary = (skipped: number, duplicates: string[]) => {
  if (skipped === 0) return 'Skipped 0 duplicates.';
  const visibleDuplicates = duplicates.slice(0, 3);
  const remaining = duplicates.length - visibleDuplicates.length;
  const suffix = remaining > 0 ? `, +${remaining} more` : '';
  return `Skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}: ${visibleDuplicates.join(', ')}${suffix}.`;
};
const formatSelectedNames = (names: string[]) => {
  const visibleNames = names.slice(0, 3);
  const remaining = names.length - visibleNames.length;
  return `${visibleNames.join(', ')}${remaining > 0 ? `, +${remaining} more` : ''}`;
};
const sortOptions: CatalogDropdownOption<CatalogSortMode>[] = [
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'usage-desc', label: 'Usage High-Low' },
  { value: 'usage-asc', label: 'Usage Low-High' },
];

const usageFilterOptions: CatalogDropdownOption<CatalogUsageFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'used', label: 'Used only' },
  { value: 'unused', label: 'Unused only' },
];

type CatalogControlDropdownProps<Value extends string> = {
  label: string;
  value: Value;
  options: CatalogDropdownOption<Value>[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (value: Value) => void;
};

function CatalogControlDropdown<Value extends string>({
  label,
  value,
  options,
  open,
  onToggle,
  onClose,
  onChange,
}: CatalogControlDropdownProps<Value>): JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find(option => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [onClose, open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onClose();
  };

  return (
      <div className="catalog-manager__control" ref={rootRef} onKeyDown={handleKeyDown}>
        <span className="catalog-manager__control-label">{label}</span>

        <div className="tag-select catalog-manager__control-select">
          <button
              type="button"
              className={`select select--sm tag-select__btn catalog-manager__control-trigger ${
                  label === 'Sort'
                      ? 'catalog-manager__control-trigger--sort'
                      : 'catalog-manager__control-trigger--filter'
              }`}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={`${label}: ${selectedOption.label}`}
              onClick={onToggle}
          >
            {selectedOption.label}
          </button>

          {open && (
              <div className="tag-select__dropdown catalog-manager__control-dropdown" role="menu">
                {options.map(option => {
                  const selected = option.value === value;

                  return (
                      <button
                          key={option.value}
                          type="button"
                          role="menuitem"
                          className={`tag-select__item catalog-manager__control-option${
                              selected ? ' tag-select__item--on' : ''
                          }`}
                          onClick={() => {
                            onChange(option.value);
                            onClose();
                          }}
                      >
                <span className="catalog-manager__control-check" aria-hidden="true">
                  {selected ? '✓' : ''}
                </span>
                        <span>{option.label}</span>
                      </button>
                  );
                })}
              </div>
          )}
        </div>
      </div>
  );
}

type CatalogManagementModalProps = {
  initialSection: CatalogSection;
  projects: Project[];
  tags: Tag[];
  projectUsage: Map<number, number>;
  tagUsage: Map<number, number>;
  onClose: () => void;
  onCreateProject: (title: string) => Promise<boolean>;
  onCreateTag: (title: string, color: string) => Promise<boolean>;
  onRenameProject: (projectID: number, title: string) => Promise<boolean>;
  onUpdateTag: (tagID: number, title: string, color: string) => Promise<boolean>;
  onDeleteProject: (projectID: number) => Promise<void>;
  onDeleteTag: (tagID: number) => Promise<void>;
};

export default function CatalogManagementModal({
  initialSection,
  projects,
  tags,
  projectUsage,
  tagUsage,
  onClose,
  onCreateProject,
  onCreateTag,
  onRenameProject,
  onUpdateTag,
  onDeleteProject,
  onDeleteTag,
}: CatalogManagementModalProps): JSX.Element {
  const [section, setSection] = useState<CatalogSection>(initialSection);
  const [query, setQuery] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [editingID, setEditingID] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingColor, setEditingColor] = useState('#6366f1');
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<PendingBulkDelete>(null);
  const [selectedProjectIDs, setSelectedProjectIDs] = useState<Set<number>>(() => new Set());
  const [selectedTagIDs, setSelectedTagIDs] = useState<Set<number>>(() => new Set());
  const [addText, setAddText] = useState('');
  const [addSummary, setAddSummary] = useState('');
  const [sortMode, setSortMode] = useState<CatalogSortMode>('name-asc');
  const [usageFilter, setUsageFilter] = useState<CatalogUsageFilter>('all');
  const [openControlDropdown, setOpenControlDropdown] = useState<CatalogControlDropdown | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const visibleProjects = useMemo(() => {
    return projects
      .filter(project => project.title.toLocaleLowerCase().includes(normalizedQuery))
      .filter(project => {
        const usage = projectUsage.get(project.projectID) ?? 0;
        if (usageFilter === 'used') return usage > 0;
        if (usageFilter === 'unused') return usage === 0;
        return true;
      })
      .sort((left, right) => {
        const titleOrder = compareCatalogTitles(left.title, right.title);
        if (sortMode === 'usage-desc') {
          const usageOrder = (projectUsage.get(right.projectID) ?? 0) - (projectUsage.get(left.projectID) ?? 0);
          return usageOrder || titleOrder;
        }
        if (sortMode === 'usage-asc') {
          const usageOrder = (projectUsage.get(left.projectID) ?? 0) - (projectUsage.get(right.projectID) ?? 0);
          return usageOrder || titleOrder;
        }
        return titleOrder;
      });
  }, [normalizedQuery, projectUsage, projects, sortMode, usageFilter]);
  const visibleTags = useMemo(() => {
    return tags
      .filter(tag => tag.title.toLocaleLowerCase().includes(normalizedQuery))
      .filter(tag => {
        const usage = tagUsage.get(tag.tagID) ?? 0;
        if (usageFilter === 'used') return usage > 0;
        if (usageFilter === 'unused') return usage === 0;
        return true;
      })
      .sort((left, right) => {
        const titleOrder = compareCatalogTitles(left.title, right.title);
        if (sortMode === 'usage-desc') {
          const usageOrder = (tagUsage.get(right.tagID) ?? 0) - (tagUsage.get(left.tagID) ?? 0);
          return usageOrder || titleOrder;
        }
        if (sortMode === 'usage-asc') {
          const usageOrder = (tagUsage.get(left.tagID) ?? 0) - (tagUsage.get(right.tagID) ?? 0);
          return usageOrder || titleOrder;
        }
        return titleOrder;
      });
  }, [normalizedQuery, sortMode, tags, tagUsage, usageFilter]);

  const changeSection = (next: CatalogSection) => {
    setSection(next);
    setQuery('');
    setSortMode('name-asc');
    setUsageFilter('all');
    setOpenControlDropdown(null);
    setEditingID(null);
    setPendingDelete(null);
    setPendingBulkDelete(null);
    setSelectedProjectIDs(new Set());
    setSelectedTagIDs(new Set());
    setAddText('');
    setAddSummary('');
  };

  const saveEdit = async () => {
    if (editingID === null) return;
    const saved = section === 'projects'
      ? await onRenameProject(editingID, editingTitle)
      : await onUpdateTag(editingID, editingTitle, editingColor);
    if (saved) setEditingID(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'projects') await onDeleteProject(pendingDelete.id);
    else await onDeleteTag(pendingDelete.id);
    if (pendingDelete.kind === 'projects') {
      setSelectedProjectIDs(prev => {
        const next = new Set(prev);
        next.delete(pendingDelete.id);
        return next;
      });
    } else {
      setSelectedTagIDs(prev => {
        const next = new Set(prev);
        next.delete(pendingDelete.id);
        return next;
      });
    }
    setPendingDelete(null);
  };

  const selectedIDs = section === 'projects' ? selectedProjectIDs : selectedTagIDs;
  const selectedCount = selectedIDs.size;
  const selectedProjects = projects.filter(project => selectedProjectIDs.has(project.projectID));
  const selectedTags = tags.filter(tag => selectedTagIDs.has(tag.tagID));
  const selectedNames = section === 'projects'
    ? selectedProjects.map(project => project.title)
    : selectedTags.map(tag => tag.title);
  const selectedUsageTotal = section === 'projects'
    ? selectedProjects.reduce((sum: number, project) => sum + (projectUsage.get(project.projectID) ?? 0), 0)
    : selectedTags.reduce((sum: number, tag) => sum + (tagUsage.get(tag.tagID) ?? 0), 0);
  const sectionSingular = section === 'projects' ? 'project' : 'tag';
  const sectionPlural = section === 'projects' ? 'projects' : 'tags';

  const clearAllSelection = () => {
    setSelectedProjectIDs(new Set());
    setSelectedTagIDs(new Set());
  };

  const clearSelection = () => {
    if (section === 'projects') setSelectedProjectIDs(new Set());
    else setSelectedTagIDs(new Set());
    setPendingBulkDelete(null);
  };

  const toggleSelection = (id: number) => {
    setEditingID(null);
    setQuery('');
    setPendingDelete(null);
    setPendingBulkDelete(null);
    const setSelected = section === 'projects' ? setSelectedProjectIDs : setSelectedTagIDs;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const beginEdit = (id: number, title: string, color?: string) => {
    setEditingID(id);
    setEditingTitle(title);
    if (color) setEditingColor(color);
    setQuery('');
    clearAllSelection();
    setPendingBulkDelete(null);
  };

  const beginSearchMode = () => {
    setEditingID(null);
    clearAllSelection();
    setPendingBulkDelete(null);
  };

  const beginListControlMode = () => {
    setEditingID(null);
    clearAllSelection();
    setPendingBulkDelete(null);
  };

  const toggleControlDropdown = (control: CatalogControlDropdown) => {
    beginListControlMode();
    setOpenControlDropdown(current => current === control ? null : control);
  };

  const handleCatalogRenameTouchStart = (event: TouchEvent<HTMLInputElement>) => {
    // Catalog rename fields share the iOS/WKWebView proxy-input focus assist
    // with mobile inline edit. Do not replace this with scroll reset timers or
    // touch-action/overscroll CSS; direct focus can pull the modal/page.
    handleProxyFocusAssistTouchStart(event);
  };

  const confirmBulkDelete = async () => {
    if (!pendingBulkDelete) return;
    for (const id of pendingBulkDelete.ids) {
      if (pendingBulkDelete.kind === 'projects') await onDeleteProject(id);
      else await onDeleteTag(id);
    }
    if (pendingBulkDelete.kind === 'projects') setSelectedProjectIDs(new Set());
    else setSelectedTagIDs(new Set());
    setPendingBulkDelete(null);
  };

  const createItems = async () => {
    const catalogNames = new Set(
      (section === 'projects' ? projects : tags).map(item => normalizeCatalogTitle(item.title)),
    );
    const inputNames = new Set<string>();
    const duplicateNames = new Map<string, string>();
    const namesToCreate: string[] = [];
    let skipped = 0;
    for (const line of addText.split(/\r?\n/)) {
      const title = line.trim();
      if (!title) continue;
      const normalized = normalizeCatalogTitle(title);
      if (catalogNames.has(normalized) || inputNames.has(normalized)) {
        skipped += 1;
        if (!duplicateNames.has(normalized)) duplicateNames.set(normalized, title);
        continue;
      }
      inputNames.add(normalized);
      namesToCreate.push(title);
    }
    let created = 0;
    let failed = 0;
    for (const title of namesToCreate) {
      const saved = section === 'projects'
        ? await onCreateProject(title)
        : await onCreateTag(title, newTagColor);
      if (saved) created += 1;
      else failed += 1;
    }
    if (created > 0) setAddText('');
    const sectionLabel = section === 'projects' ? 'projects' : 'tags';
    setAddSummary(`Created ${created} ${sectionLabel}. ${formatDuplicateSummary(skipped, Array.from(duplicateNames.values()))} Failed ${failed}.`);
  };

  const items = section === 'projects' ? visibleProjects : visibleTags;
  const addPlaceholder = section === 'projects'
    ? 'Add project names, one per line'
    : 'Add tag names, one per line';
  const addLabel = section === 'projects' ? 'Project names' : 'Tag names';
  const createLabel = section === 'projects' ? 'Create Projects' : 'Create Tags';
  return createPortal(
    <div className="modal-overlay modal-overlay--catalog-manager" onClick={onClose}>
      <div className="modal catalog-manager" role="dialog" aria-modal="true" aria-labelledby="catalog-manager-title" onClick={event => event.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title" id="catalog-manager-title">Manage Projects and Tags</h2>
          <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close project and tag management">×</button>
        </div>

        <div className="catalog-manager__tabs">
          <button className={`btn catalog-manager__tab${section === 'projects' ? '' : ' btn--ghost'}`} onClick={() => changeSection('projects')}>Projects</button>
          <button className={`btn catalog-manager__tab${section === 'tags' ? '' : ' btn--ghost'}`} onClick={() => changeSection('tags')}>Tags</button>
        </div>

        <CatalogBulkCreateSection
          section={section}
          addText={addText}
          addSummary={addSummary}
          newTagColor={newTagColor}
          addPlaceholder={addPlaceholder}
          addLabel={addLabel}
          createLabel={createLabel}
          onAddTextChange={value => {
            setAddText(value);
            setAddSummary('');
          }}
          onNewTagColorChange={setNewTagColor}
          onCreateItems={createItems}
        />

        <input
          type="search"
          className="input catalog-manager__search"
          value={query}
          onFocus={beginSearchMode}
          onChange={event => { beginSearchMode(); setQuery(event.currentTarget.value); }}
          placeholder={`Search ${section}`}
          aria-label={`Search managed ${section}`}
        />

        <div className="catalog-manager__list-controls">
          <CatalogControlDropdown
            label="Sort"
            value={sortMode}
            options={sortOptions}
            open={openControlDropdown === 'sort'}
            onToggle={() => toggleControlDropdown('sort')}
            onClose={() => setOpenControlDropdown(current => current === 'sort' ? null : current)}
            onChange={nextSortMode => {
              beginListControlMode();
              setSortMode(nextSortMode);
            }}
          />
          <CatalogControlDropdown
            label="Filter"
            value={usageFilter}
            options={usageFilterOptions}
            open={openControlDropdown === 'filter'}
            onToggle={() => toggleControlDropdown('filter')}
            onClose={() => setOpenControlDropdown(current => current === 'filter' ? null : current)}
            onChange={nextUsageFilter => {
              beginListControlMode();
              setUsageFilter(nextUsageFilter);
            }}
          />
        </div>

        {selectedCount > 0 && (
          <div className="catalog-manager__bulk-bar" role="status">
            <span className="catalog-manager__bulk-count">{selectedCount} {sectionSingular}{selectedCount === 1 ? '' : 's'} selected</span>
            <div className="catalog-manager__bulk-actions">
              <button className="btn btn--danger btn--sm" onClick={() => { setPendingDelete(null); setPendingBulkDelete({ kind: section, ids: Array.from(selectedIDs) }); }}>
                Delete selected {sectionPlural}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={clearSelection}>Clear selection</button>
            </div>
          </div>
        )}

        {pendingBulkDelete && (
          <div className="catalog-manager__confirm catalog-manager__confirm--bulk" role="alert">
            <span>
              Delete {selectedCount} {sectionSingular}{selectedCount === 1 ? '' : 's'}: {formatSelectedNames(selectedNames)}?{' '}
              {section === 'projects'
                ? `${selectedUsageTotal} affected task${selectedUsageTotal === 1 ? '' : 's'} will become unassigned.`
                : `These ${sectionPlural} will be removed from ${selectedUsageTotal} task assignment${selectedUsageTotal === 1 ? '' : 's'}.`}
            </span>
            <button className="btn btn--danger btn--sm" onClick={confirmBulkDelete}>Delete selected {sectionPlural}</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setPendingBulkDelete(null)}>Cancel</button>
          </div>
        )}

        <div className="catalog-manager__body">
          {items.length === 0 ? (
            <p className="catalog-manager__empty">No {section} match your search.</p>
          ) : (
            <ul className="catalog-manager__list">
              {section === 'projects'
                ? visibleProjects.map(project => {
                    const editing = editingID === project.projectID;
                    const usageCount = projectUsage.get(project.projectID) ?? 0;
                    return (
                      <CatalogManagerItemRow
                        key={project.projectID}
                        kind="projects"
                        title={project.title}
                        usageCount={usageCount}
                        selected={selectedProjectIDs.has(project.projectID)}
                        editing={editing}
                        editingTitle={editingTitle}
                        editingColor={editingColor}
                        onToggleSelection={() => toggleSelection(project.projectID)}
                        onEditingTitleChange={setEditingTitle}
                        onEditingColorChange={setEditingColor}
                        onRenameTouchStart={handleCatalogRenameTouchStart}
                        onSaveEdit={saveEdit}
                        onCancelEdit={() => setEditingID(null)}
                        onBeginEdit={() => beginEdit(project.projectID, project.title)}
                        onRequestDelete={() => {
                          setPendingBulkDelete(null);
                          setPendingDelete({ kind: 'projects', id: project.projectID, title: project.title, usageCount });
                        }}
                      />
                    );
                  })
                : visibleTags.map(tag => {
                    const editing = editingID === tag.tagID;
                    const usageCount = tagUsage.get(tag.tagID) ?? 0;
                    return (
                      <CatalogManagerItemRow
                        key={tag.tagID}
                        kind="tags"
                        title={tag.title}
                        usageCount={usageCount}
                        selected={selectedTagIDs.has(tag.tagID)}
                        editing={editing}
                        color={tag.color}
                        editingTitle={editingTitle}
                        editingColor={editingColor}
                        onToggleSelection={() => toggleSelection(tag.tagID)}
                        onEditingTitleChange={setEditingTitle}
                        onEditingColorChange={setEditingColor}
                        onRenameTouchStart={handleCatalogRenameTouchStart}
                        onSaveEdit={saveEdit}
                        onCancelEdit={() => setEditingID(null)}
                        onBeginEdit={() => beginEdit(tag.tagID, tag.title, tag.color ?? '#6366f1')}
                        onRequestDelete={() => {
                          setPendingBulkDelete(null);
                          setPendingDelete({ kind: 'tags', id: tag.tagID, title: tag.title, usageCount });
                        }}
                      />
                    );
                  })}
            </ul>
          )}
        </div>

        {pendingDelete && (
          <div className="catalog-manager__confirm" role="alert">
            <span>Delete &quot;{pendingDelete.title}&quot;? This will affect {pendingDelete.usageCount} task{pendingDelete.usageCount === 1 ? '' : 's'}.</span>
            <button className="btn btn--danger btn--sm" onClick={confirmDelete}>Confirm delete</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setPendingDelete(null)}>Cancel</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
