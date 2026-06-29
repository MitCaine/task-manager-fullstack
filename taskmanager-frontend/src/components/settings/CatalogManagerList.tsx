import type { TouchEvent } from 'react';
import type { Project, Tag } from '../../types/task';
import CatalogManagerItemRow from './CatalogManagerItemRow';

type CatalogSection = 'projects' | 'tags';
type PendingDeleteRequest = { kind: CatalogSection; id: number; title: string; usageCount: number };

type CatalogManagerListProps = {
  section: CatalogSection;
  visibleProjects: Project[];
  visibleTags: Tag[];
  projectUsage: Map<number, number>;
  tagUsage: Map<number, number>;
  selectedProjectIDs: Set<number>;
  selectedTagIDs: Set<number>;
  editingID: number | null;
  editingTitle: string;
  editingColor: string;
  onToggleSelection: (id: number) => void;
  onEditingTitleChange: (value: string) => void;
  onEditingColorChange: (value: string) => void;
  onRenameTouchStart: (event: TouchEvent<HTMLInputElement>) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onBeginEdit: (id: number, title: string, color?: string) => void;
  onRequestDelete: (request: PendingDeleteRequest) => void;
};

export default function CatalogManagerList({
  section,
  visibleProjects,
  visibleTags,
  projectUsage,
  tagUsage,
  selectedProjectIDs,
  selectedTagIDs,
  editingID,
  editingTitle,
  editingColor,
  onToggleSelection,
  onEditingTitleChange,
  onEditingColorChange,
  onRenameTouchStart,
  onSaveEdit,
  onCancelEdit,
  onBeginEdit,
  onRequestDelete,
}: CatalogManagerListProps): JSX.Element {
  const items = section === 'projects' ? visibleProjects : visibleTags;

  return (
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
                    onToggleSelection={() => onToggleSelection(project.projectID)}
                    onEditingTitleChange={onEditingTitleChange}
                    onEditingColorChange={onEditingColorChange}
                    onRenameTouchStart={onRenameTouchStart}
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                    onBeginEdit={() => onBeginEdit(project.projectID, project.title)}
                    onRequestDelete={() => onRequestDelete({
                      kind: 'projects',
                      id: project.projectID,
                      title: project.title,
                      usageCount,
                    })}
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
                    onToggleSelection={() => onToggleSelection(tag.tagID)}
                    onEditingTitleChange={onEditingTitleChange}
                    onEditingColorChange={onEditingColorChange}
                    onRenameTouchStart={onRenameTouchStart}
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                    onBeginEdit={() => onBeginEdit(tag.tagID, tag.title, tag.color ?? '#6366f1')}
                    onRequestDelete={() => onRequestDelete({
                      kind: 'tags',
                      id: tag.tagID,
                      title: tag.title,
                      usageCount,
                    })}
                  />
                );
              })}
        </ul>
      )}
    </div>
  );
}
