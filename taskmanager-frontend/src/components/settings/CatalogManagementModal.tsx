import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Project, Tag } from '../../types/task';

type CatalogSection = 'projects' | 'tags';
type PendingDelete = { kind: CatalogSection; id: number; title: string; usageCount: number } | null;
type PendingBulkDelete = { kind: CatalogSection; ids: number[] } | null;

const usageLabel = (count: number) => `${count} task${count === 1 ? '' : 's'}`;
const normalizeCatalogTitle = (value: string) => value.trim().toLocaleLowerCase();
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
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredProjects = useMemo(
    () => projects.filter(project => project.title.toLocaleLowerCase().includes(normalizedQuery)),
    [normalizedQuery, projects],
  );
  const filteredTags = useMemo(
    () => tags.filter(tag => tag.title.toLocaleLowerCase().includes(normalizedQuery)),
    [normalizedQuery, tags],
  );

  const changeSection = (next: CatalogSection) => {
    setSection(next);
    setQuery('');
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

  const items = section === 'projects' ? filteredProjects : filteredTags;
  const addPlaceholder = section === 'projects'
    ? 'Add project names, one per line'
    : 'Add tag names, one per line';
  const addLabel = section === 'projects' ? 'Project names' : 'Tag names';
  const createLabel = section === 'projects' ? 'Create Projects' : 'Create Tags';
  const renderColorControl = (value: string, onChange: (value: string) => void, ariaLabel: string) => (
    <label className="catalog-manager__color-control">
      <input className="catalog-manager__color-input" type="color" value={value} onChange={event => onChange(event.currentTarget.value)} aria-label={ariaLabel} />
      <span className="catalog-manager__color-swatch" style={{ background: value }} aria-hidden="true" />
      <span>Tag Color</span>
    </label>
  );

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

        <div className={`catalog-manager__create catalog-manager__create--${section}`}>
          <textarea
            id={`catalog-manager-create-${section}`}
            className="input catalog-manager__create-input"
            value={addText}
            onChange={event => { setAddText(event.currentTarget.value); setAddSummary(''); }}
            placeholder={addPlaceholder}
            aria-label={addLabel}
            rows={3}
          />
          <div className={`catalog-manager__create-actions catalog-manager__create-actions--${section}`}>
            <button className="btn catalog-manager__create-button" onClick={createItems} disabled={!addText.trim()}>
              {createLabel}
            </button>
            {section === 'tags' && (
              renderColorControl(newTagColor, setNewTagColor, 'New tag color')
            )}
          </div>
        </div>
        {addSummary && <div className="catalog-manager__create-summary" role="status">{addSummary}</div>}

        <input
          type="search"
          className="input catalog-manager__search"
          value={query}
          onFocus={beginSearchMode}
          onChange={event => { beginSearchMode(); setQuery(event.currentTarget.value); }}
          placeholder={`Search ${section}`}
          aria-label={`Search managed ${section}`}
        />

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
                ? filteredProjects.map(project => {
                    const editing = editingID === project.projectID;
                    return (
                      <li key={project.projectID} className={`catalog-manager__item catalog-manager__item--project${editing ? ' catalog-manager__item--editing' : ''}`}>
                        {!editing && (
                          <input
                            type="checkbox"
                            className="catalog-manager__select"
                            checked={selectedProjectIDs.has(project.projectID)}
                            onChange={() => toggleSelection(project.projectID)}
                            aria-label={`Select project ${project.title}`}
                          />
                        )}
                        <div className="catalog-manager__main">
                          {editing
                            ? <input className="input input--sm" value={editingTitle} onChange={event => setEditingTitle(event.currentTarget.value)} aria-label={`Rename project ${project.title}`} />
                            : <span className="catalog-manager__name">{project.title}</span>}
                          {!editing && <span className="catalog-manager__usage">{usageLabel(projectUsage.get(project.projectID) ?? 0)}</span>}
                        </div>
                        <div className="catalog-manager__actions">
                          {editing
                            ? <><button className="btn btn--sm" onClick={saveEdit}>Save</button><button className="btn btn--ghost btn--sm" onClick={() => setEditingID(null)}>Cancel</button></>
                            : <button className="btn btn--ghost btn--sm" onClick={() => beginEdit(project.projectID, project.title)}>Edit</button>}
                          <button className="btn btn--danger btn--sm" onClick={() => { setPendingBulkDelete(null); setPendingDelete({ kind: 'projects', id: project.projectID, title: project.title, usageCount: projectUsage.get(project.projectID) ?? 0 }); }}>Delete</button>
                        </div>
                      </li>
                    );
                  })
                : filteredTags.map(tag => {
                    const editing = editingID === tag.tagID;
                    return (
                      <li key={tag.tagID} className={`catalog-manager__item catalog-manager__item--tag${editing ? ' catalog-manager__item--editing' : ''}`}>
                        {!editing && (
                          <input
                            type="checkbox"
                            className="catalog-manager__select"
                            checked={selectedTagIDs.has(tag.tagID)}
                            onChange={() => toggleSelection(tag.tagID)}
                            aria-label={`Select tag ${tag.title}`}
                          />
                        )}
                        <div className="catalog-manager__main">
                          {!editing && <span className="tag-dot" style={{ background: tag.color ?? '#6366f1' }} />}
                          {editing
                            ? <input className="input input--sm" value={editingTitle} onChange={event => setEditingTitle(event.currentTarget.value)} aria-label={`Rename tag ${tag.title}`} />
                            : <span className="catalog-manager__name">{tag.title}</span>}
                          {editing && renderColorControl(editingColor, setEditingColor, `Color for tag ${tag.title}`)}
                          {!editing && <span className="catalog-manager__usage">{usageLabel(tagUsage.get(tag.tagID) ?? 0)}</span>}
                        </div>
                        <div className="catalog-manager__actions">
                          {editing
                            ? <><button className="btn btn--sm" onClick={saveEdit}>Save</button><button className="btn btn--ghost btn--sm" onClick={() => setEditingID(null)}>Cancel</button></>
                            : <button className="btn btn--ghost btn--sm" onClick={() => beginEdit(tag.tagID, tag.title, tag.color ?? '#6366f1')}>Edit</button>}
                          <button className="btn btn--danger btn--sm" onClick={() => { setPendingBulkDelete(null); setPendingDelete({ kind: 'tags', id: tag.tagID, title: tag.title, usageCount: tagUsage.get(tag.tagID) ?? 0 }); }}>Delete</button>
                        </div>
                      </li>
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
