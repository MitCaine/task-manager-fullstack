import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { Project, Tag, Task } from '../../types/task';
import type { Ampm } from '../../utils/taskForm';
import type { RepeatValue } from '../../utils/taskRecurrence';
import { findProjectById } from '../../utils/taskDisplayHelpers';
import TaskEditorFields from '../create-task/TaskEditorFields';
import { SelectedTagChips } from '../create-task/TagProjectChips';
import InlineProjectForm from '../forms/InlineProjectForm';
import InlineTagForm from '../forms/InlineTagForm';
import PrioritySelector from '../shared/PrioritySelector';
import type { PriorityValue } from '../shared/PrioritySelector';
import SearchableCatalogList from '../shared/SearchableCatalogList';

type InlineEditVariant = 'inline' | 'mobile';

type InlineTaskEditActions = {
  saveEdit: (task: Task) => void;
  cancelEdit: () => void;
};

type InlineTaskEditCatalog = {
  projects: Project[];
  tags: Tag[];
  priorityColors: Record<string, string>;
  tagColors: string[];
  projectMaxLength: number;
  tagMaxLength: number;
};

type InlineTaskEditRefs = {
  editProjectDropdownRef: RefObject<HTMLDivElement>;
  editTagDropdownRef: RefObject<HTMLDivElement>;
  inlineEditProjectInputRef: RefObject<HTMLInputElement>;
  inlineEditTagInputRef: RefObject<HTMLInputElement>;
};

export type InlineTaskEditCardProps = {
  task: Task;
  variant?: InlineEditVariant;
  actions: InlineTaskEditActions;
  catalog: InlineTaskEditCatalog;
  refs: InlineTaskEditRefs;
  editTitle: string;
  setEditTitle: (value: string) => void;
  editDescription: string;
  setEditDescription: (value: string) => void;
  editDate: string;
  setEditDate: (value: string) => void;
  editHour: string;
  setEditHour: (value: string) => void;
  editMinute: string;
  setEditMinute: (value: string) => void;
  editAmpm: Ampm;
  setEditAmpm: (value: Ampm) => void;
  editShowTime: boolean;
  setEditShowTime: Dispatch<SetStateAction<boolean>>;
  editShowEndTime: boolean;
  toggleEditEndTime: () => void;
  editEndHour: string;
  setEditEndHour: (value: string) => void;
  editEndMinute: string;
  setEditEndMinute: (value: string) => void;
  editEndAmpm: Ampm;
  setEditEndAmpm: (value: Ampm) => void;
  editRepeat: RepeatValue;
  setEditRepeat: (value: RepeatValue) => void;
  currentEditTimeRangeError: string | null;
  openTimeEditorScope: string | null;
  setOpenTimeEditorScope: Dispatch<SetStateAction<string | null>>;
  closeFloatingControls: (options?: { timeEditors?: boolean; createControls?: boolean; inlineEditControls?: boolean }) => void;
  is24Hour: boolean;
  hourOptions: string[];
  inlineEditOpenControl: string | null;
  setInlineEditOpenControl: Dispatch<SetStateAction<string | null>>;
  toggleInlineEditDropdown: (control: 'priority' | 'project' | 'tags' | 'repeat') => void;
  editPriority: PriorityValue | '';
  setEditPriority: (value: PriorityValue | '') => void;
  editProjectID: number | '';
  setEditProjectID: (value: number | '') => void;
  editTaskTagIDs: number[];
  setEditTaskTagIDs: Dispatch<SetStateAction<number[]>>;
  showInlineEditProject: boolean;
  setShowInlineEditProject: (value: boolean) => void;
  newProjectTitle: string;
  setNewProjectTitle: (value: string) => void;
  addProjectInlineEdit: () => void;
  showInlineEditTag: boolean;
  setShowInlineEditTag: (value: boolean) => void;
  newTagTitle: string;
  setNewTagTitle: (value: string) => void;
  newTagColor: string;
  setNewTagColor: (value: string) => void;
  addTagInlineEdit: () => void;
};

export default function InlineTaskEditCard({
  task,
  variant = 'inline',
  actions,
  catalog,
  refs,
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editDate,
  setEditDate,
  editHour,
  setEditHour,
  editMinute,
  setEditMinute,
  editAmpm,
  setEditAmpm,
  editShowTime,
  setEditShowTime,
  editShowEndTime,
  toggleEditEndTime,
  editEndHour,
  setEditEndHour,
  editEndMinute,
  setEditEndMinute,
  editEndAmpm,
  setEditEndAmpm,
  editRepeat,
  setEditRepeat,
  currentEditTimeRangeError,
  openTimeEditorScope,
  setOpenTimeEditorScope,
  closeFloatingControls,
  is24Hour,
  hourOptions,
  inlineEditOpenControl,
  setInlineEditOpenControl,
  toggleInlineEditDropdown,
  editPriority,
  setEditPriority,
  editProjectID,
  setEditProjectID,
  editTaskTagIDs,
  setEditTaskTagIDs,
  showInlineEditProject,
  setShowInlineEditProject,
  newProjectTitle,
  setNewProjectTitle,
  addProjectInlineEdit,
  showInlineEditTag,
  setShowInlineEditTag,
  newTagTitle,
  setNewTagTitle,
  newTagColor,
  setNewTagColor,
  addTagInlineEdit,
}: InlineTaskEditCardProps): JSX.Element {
  const scopeId = `${variant === 'mobile' ? 'mobile-edit' : 'inline-edit'}-${task.taskID}`;
  const { saveEdit, cancelEdit } = actions;
  const { projects, tags, priorityColors, tagColors, projectMaxLength, tagMaxLength } = catalog;
  const {
    editProjectDropdownRef,
    editTagDropdownRef,
    inlineEditProjectInputRef,
    inlineEditTagInputRef,
  } = refs;

  return (
    <div
      className={`item__edit-card${variant === 'mobile' ? ' mobile-edit-panel' : ''}`}
      data-text-focus-scope={scopeId}
      data-edit-layout={variant}
      onClick={e => e.stopPropagation()}
    >
      <div className="mobile-edit-panel__header">
        <span className="mobile-edit-panel__title">Edit task</span>
      </div>
      <TaskEditorFields
        titleValue={editTitle}
        onTitleChange={setEditTitle}
        descriptionValue={editDescription}
        onDescriptionChange={setEditDescription}
        descriptionPlaceholder="Description"
        descriptionRows={2}
        descriptionTitleStyleInput={variant === 'mobile'}
        dateTimeRowProps={{
          editorScope: scopeId,
          openTimeEditorScope,
          setOpenTimeEditorScope,
          closeFloatingControls,
          is24Hour,
          hourOptions,
          openControl: inlineEditOpenControl,
          setOpenControl: setInlineEditOpenControl,
          controlIds: {
            date: `${scopeId}:date`,
            start: `${scopeId}:start`,
            end: `${scopeId}:end`,
            startHour: `${scopeId}:start-hour`,
            startMinute: `${scopeId}:start-minute`,
            startAmpm: `${scopeId}:start-ampm`,
            endHour: `${scopeId}:end-hour`,
            endMinute: `${scopeId}:end-minute`,
            endAmpm: `${scopeId}:end-ampm`,
          },
          dateVal: editDate,
          hourVal: editHour,
          minuteVal: editMinute,
          ampmVal: editAmpm,
          onDate: setEditDate,
          onHour: setEditHour,
          onMinute: setEditMinute,
          onAmpm: setEditAmpm,
          showTime: editShowTime,
          onToggleTime: () => setEditShowTime(p => !p),
          onRemoveStart: () => setEditShowTime(false),
          showEndTime: editShowEndTime,
          onToggleEndTime: toggleEditEndTime,
          endHourVal: editEndHour,
          endMinuteVal: editEndMinute,
          endAmpmVal: editEndAmpm,
          onEndHour: setEditEndHour,
          onEndMinute: setEditEndMinute,
          onEndAmpm: setEditEndAmpm,
        }}
        recurrenceControlProps={{
          value: editRepeat,
          onChange: setEditRepeat,
          openControl: inlineEditOpenControl,
          onToggle: () => toggleInlineEditDropdown('repeat'),
          onClose: () => setInlineEditOpenControl(null),
          controlId: 'repeat',
          menuScope: scopeId,
        }}
        timeRangeError={currentEditTimeRangeError}
      />
      <div className="form-row item__edit-meta-row">
        <PrioritySelector
          value={editPriority}
          colors={priorityColors}
          open={inlineEditOpenControl === 'priority'}
          onToggle={() => toggleInlineEditDropdown('priority')}
          onSelect={value => { setEditPriority(value); setInlineEditOpenControl(null); }}
          triggerLabel="Priority"
          removeLabel="Remove priority"
          triggerAttributes={{ 'data-inline-edit-menu-trigger': true }}
          dropdownAttributes={{ 'data-inline-edit-menu-boundary': true }}
        />

        <div className="tag-select" ref={editProjectDropdownRef}>
          <button
            type="button"
            className={`select tag-select__btn${editProjectID !== '' ? ' tag-select__btn--active' : ''}`}
            data-inline-edit-menu-trigger
            onClick={() => {
              toggleInlineEditDropdown('project');
            }}
          >
            {editProjectID === ''
              ? 'Project'
              : findProjectById(projects, editProjectID)?.title ?? 'Project'}
          </button>
          {inlineEditOpenControl === 'project' && (
            <div className="tag-select__dropdown" data-inline-edit-menu-boundary>
              <button
                type="button"
                className="tag-select__new-btn tag-select__new-btn--top"
                onClick={() => {
                  setInlineEditOpenControl(null);
                  if (showInlineEditProject) { inlineEditProjectInputRef.current?.focus(); }
                  else { setShowInlineEditProject(true); }
                }}
              >+ New Project</button>
              <button
                type="button"
                className={`tag-select__item tag-select__item--remove${editProjectID === '' ? ' tag-select__item--on' : ''}`}
                onClick={() => { setEditProjectID(''); setInlineEditOpenControl(null); }}
              >
                No project
              </button>
              <SearchableCatalogList
                items={projects}
                searchLabel="Search edit projects"
                searchPlaceholder="Search projects..."
                emptyMessage="No projects yet."
                noMatchesMessage="No projects match your search."
                renderItem={p => {
                  const selected = Number(editProjectID) === p.projectID;
                  return (
                    <button
                      key={p.projectID}
                      type="button"
                      className={`tag-select__item${selected ? ' tag-select__item--on' : ''}`}
                      onClick={() => { setEditProjectID(selected ? '' : p.projectID); setInlineEditOpenControl(null); }}
                    >
                      {p.title}
                    </button>
                  );
                }}
              />
            </div>
          )}
        </div>

        <div className="tag-select" ref={editTagDropdownRef}>
          <button
            type="button"
            className={`select tag-select__btn${editTaskTagIDs.length > 0 ? ' tag-select__btn--active' : ''}`}
            data-inline-edit-menu-trigger
            onClick={() => {
              toggleInlineEditDropdown('tags');
            }}
          >
            {editTaskTagIDs.length === 0 ? 'Tags' : `${editTaskTagIDs.length} tag${editTaskTagIDs.length !== 1 ? 's' : ''}`}
          </button>
          {inlineEditOpenControl === 'tags' && (
            <div className="tag-select__dropdown" data-inline-edit-menu-boundary>
              <button
                type="button"
                className="tag-select__new-btn tag-select__new-btn--top"
                onClick={() => {
                  setInlineEditOpenControl(null);
                  if (showInlineEditTag) { inlineEditTagInputRef.current?.focus(); }
                  else { setShowInlineEditTag(true); }
                }}
              >+ New Tag</button>
              <SearchableCatalogList
                items={tags}
                searchLabel="Search edit tags"
                searchPlaceholder="Search tags..."
                emptyMessage="No tags yet."
                noMatchesMessage="No tags match your search."
                isItemSelected={tag => editTaskTagIDs.includes(tag.tagID)}
                renderItem={tag => {
                  const selected = editTaskTagIDs.includes(tag.tagID);
                  return (
                    <label key={tag.tagID} className={`tag-select__item tag-select__item-label${selected ? ' tag-select__item--on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => setEditTaskTagIDs(prev => selected ? prev.filter(id => id !== tag.tagID) : [...prev, tag.tagID])}
                      />
                      <span className="tag-dot" style={{ background: tag.color ?? '#6366f1' }} />
                      {tag.title}
                    </label>
                  );
                }}
              />
            </div>
          )}
        </div>
      </div>
      <SelectedTagChips
        tagIds={editTaskTagIDs}
        tags={tags}
        className="item__edit-selected-tags"
        onRemove={id => setEditTaskTagIDs(prev => prev.filter(i => i !== id))}
      />
      {showInlineEditProject && (
        <InlineProjectForm
          inputRef={inlineEditProjectInputRef}
          value={newProjectTitle}
          maxLength={projectMaxLength}
          placeholder="Project name..."
          onChange={setNewProjectTitle}
          onSubmit={addProjectInlineEdit}
          onCancel={() => { setShowInlineEditProject(false); setNewProjectTitle(''); }}
        />
      )}
      {showInlineEditTag && (
        <InlineTagForm
          inputRef={inlineEditTagInputRef}
          value={newTagTitle}
          selectedColor={newTagColor}
          colors={tagColors}
          maxLength={tagMaxLength}
          placeholder="Tag name..."
          onChange={setNewTagTitle}
          onSubmit={addTagInlineEdit}
          onCancel={() => { setShowInlineEditTag(false); setNewTagTitle(''); setNewTagColor('#6366f1'); }}
          onSelectColor={setNewTagColor}
          getColorAriaLabel={c => `Choose tag color ${c}`}
        />
      )}
      <div className="item__edit-actions">
        <button className="btn btn--sm" onClick={() => saveEdit(task)}>Save</button>
        <button className="btn btn--ghost btn--sm" onClick={cancelEdit}>Cancel</button>
      </div>
    </div>
  );
}
