import type { ButtonHTMLAttributes, HTMLAttributes, RefObject } from 'react';
import type { Project } from '../../types/task';
import { compactText } from '../../utils/taskDisplay';
import { findProjectById } from '../../utils/taskDisplayHelpers';
import SearchableCatalogList from './SearchableCatalogList';

type DataAttributes = Record<`data-${string}`, string | boolean | number | undefined>;

type ProjectSelectorProps = {
  projects: Project[];
  selectedProjectID: number | '';
  open: boolean;
  onToggle: () => void;
  onProjectChange: (value: number | '') => void;
  onRequestNewProject: () => void;
  rootRef?: RefObject<HTMLDivElement>;
  triggerAttributes?: ButtonHTMLAttributes<HTMLButtonElement> & DataAttributes;
  dropdownAttributes?: HTMLAttributes<HTMLDivElement> & DataAttributes;
  searchLabel: string;
  compactSelectedTitleLength?: number;
  closeOnSelect?: boolean;
  showNoProjectOption?: boolean;
  onClose?: () => void;
  onDeleteProject?: (projectID: number) => void;
  showFolderIcon?: boolean;
};

export default function ProjectSelector({
  projects,
  selectedProjectID,
  open,
  onToggle,
  onProjectChange,
  onRequestNewProject,
  rootRef,
  triggerAttributes,
  dropdownAttributes,
  searchLabel,
  compactSelectedTitleLength,
  closeOnSelect = false,
  showNoProjectOption = false,
  onClose,
  onDeleteProject,
  showFolderIcon = false,
}: ProjectSelectorProps): JSX.Element {
  const selectedProject = selectedProjectID !== '' ? findProjectById(projects, selectedProjectID) : null;
  const selectedTitle = selectedProject?.title ?? 'Project';
  const selectedLabel = selectedProjectID === ''
    ? 'Project'
    : compactSelectedTitleLength === undefined
      ? selectedTitle
      : compactText(selectedTitle, compactSelectedTitleLength);

  const selectProject = (projectID: number, selected: boolean) => {
    onProjectChange(selected ? '' : projectID);
    if (closeOnSelect) onClose?.();
  };

  return (
    <div className="tag-select" ref={rootRef}>
      <button
        type="button"
        className={`select tag-select__btn${selectedProjectID !== '' ? ' tag-select__btn--active' : ''}`}
        onClick={onToggle}
        {...triggerAttributes}
      >
        {selectedLabel}
      </button>
      {open && (
        <div className="tag-select__dropdown" {...dropdownAttributes}>
          <button
            type="button"
            className="tag-select__new-btn tag-select__new-btn--top"
            onClick={onRequestNewProject}
          >+ New Project</button>
          {showNoProjectOption && (
            <button
              type="button"
              className={`tag-select__item tag-select__item--remove${selectedProjectID === '' ? ' tag-select__item--on' : ''}`}
              onClick={() => { onProjectChange(''); onClose?.(); }}
            >
              No project
            </button>
          )}
          <SearchableCatalogList
            items={projects}
            searchLabel={searchLabel}
            searchPlaceholder="Search projects..."
            emptyMessage="No projects yet."
            noMatchesMessage="No projects match your search."
            renderItem={project => {
              const selected = Number(selectedProjectID) === project.projectID;
              if (!onDeleteProject) {
                return (
                  <button
                    key={project.projectID}
                    type="button"
                    className={`tag-select__item${selected ? ' tag-select__item--on' : ''}`}
                    onClick={() => selectProject(project.projectID, selected)}
                  >
                    {project.title}
                  </button>
                );
              }

              return (
                <div key={project.projectID} className={`tag-select__item${selected ? ' tag-select__item--on' : ''}`}>
                  <label className="tag-select__item-label">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => selectProject(project.projectID, selected)}
                    />
                    {showFolderIcon ? '📁 ' : ''}{project.title}
                  </label>
                  <button
                    type="button"
                    className="tag-select__delete"
                    onClick={event => { event.stopPropagation(); onDeleteProject(project.projectID); }}
                    title="Delete project"
                    aria-label="Delete project"
                  >×</button>
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
