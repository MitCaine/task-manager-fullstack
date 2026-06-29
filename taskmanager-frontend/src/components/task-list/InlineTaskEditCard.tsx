import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { Project, Tag, Task } from '../../types/task';
import type { Ampm } from '../../utils/taskForm';
import type { RepeatValue } from '../../utils/taskRecurrence';
import { handleProxyFocusAssistTouchStart } from '../../utils/mobileFocusAssist';
import TaskEditorFields from '../create-task/TaskEditorFields';
import { SelectedTagChips } from '../create-task/TagProjectChips';
import InlineProjectForm from '../forms/InlineProjectForm';
import InlineTagForm from '../forms/InlineTagForm';
import PrioritySelector from '../shared/PrioritySelector';
import type { PriorityValue } from '../shared/PrioritySelector';
import ProjectSelector from '../shared/ProjectSelector';
import TagSelector from '../shared/TagSelector';

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

type InlineProjectCreation = {
  showInlineEditProject: boolean;
  setShowInlineEditProject: (value: boolean) => void;
  newProjectTitle: string;
  setNewProjectTitle: (value: string) => void;
  addProjectInlineEdit: () => void;
};

type InlineTagCreation = {
  showInlineEditTag: boolean;
  setShowInlineEditTag: (value: boolean) => void;
  newTagTitle: string;
  setNewTagTitle: (value: string) => void;
  newTagColor: string;
  setNewTagColor: (value: string) => void;
  addTagInlineEdit: () => void;
};

type InlineTaskEditDraft = {
  editTitle: string;
  setEditTitle: (value: string) => void;
  editDescription: string;
  setEditDescription: (value: string) => void;
  editPriority: PriorityValue | '';
  setEditPriority: (value: PriorityValue | '') => void;
  editProjectID: number | '';
  setEditProjectID: (value: number | '') => void;
  editTaskTagIDs: number[];
  setEditTaskTagIDs: Dispatch<SetStateAction<number[]>>;
  editRepeat: RepeatValue;
  setEditRepeat: (value: RepeatValue) => void;
};

type InlineTaskEditSchedule = {
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
  currentEditTimeRangeError: string | null;
  is24Hour: boolean;
  hourOptions: string[];
};

export type InlineTaskEditCardProps = {
  task: Task;
  variant?: InlineEditVariant;
  actions: InlineTaskEditActions;
  catalog: InlineTaskEditCatalog;
  refs: InlineTaskEditRefs;
  inlineProjectCreation: InlineProjectCreation;
  inlineTagCreation: InlineTagCreation;
  draft: InlineTaskEditDraft;
  schedule: InlineTaskEditSchedule;
  openTimeEditorScope: string | null;
  setOpenTimeEditorScope: Dispatch<SetStateAction<string | null>>;
  closeFloatingControls: (options?: { timeEditors?: boolean; createControls?: boolean; inlineEditControls?: boolean }) => void;
  inlineEditOpenControl: string | null;
  setInlineEditOpenControl: Dispatch<SetStateAction<string | null>>;
  toggleInlineEditDropdown: (control: 'priority' | 'project' | 'tags' | 'repeat') => void;
};

export default function InlineTaskEditCard({
  task,
  variant = 'inline',
  actions,
  catalog,
  refs,
  inlineProjectCreation,
  inlineTagCreation,
  draft,
  schedule,
  openTimeEditorScope,
  setOpenTimeEditorScope,
  closeFloatingControls,
  inlineEditOpenControl,
  setInlineEditOpenControl,
  toggleInlineEditDropdown,
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
  const {
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    editPriority,
    setEditPriority,
    editProjectID,
    setEditProjectID,
    editTaskTagIDs,
    setEditTaskTagIDs,
    editRepeat,
    setEditRepeat,
  } = draft;
  const {
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
    currentEditTimeRangeError,
    is24Hour,
    hourOptions,
  } = schedule;
  const {
    showInlineEditProject,
    setShowInlineEditProject,
    newProjectTitle,
    setNewProjectTitle,
    addProjectInlineEdit,
  } = inlineProjectCreation;
  const {
    showInlineEditTag,
    setShowInlineEditTag,
    newTagTitle,
    setNewTagTitle,
    newTagColor,
    setNewTagColor,
    addTagInlineEdit,
  } = inlineTagCreation;

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
        // Mobile inline edit text focus uses the same WKWebView proxy-input
        // assist as catalog rename. The proxy gets focus from a safe fixed
        // viewport position first; direct focus on the real input can pull the
        // mobile card/page, and CSS/timer-only fixes were insufficient.
        onTitleTouchStart={variant === 'mobile' ? handleProxyFocusAssistTouchStart : undefined}
        onDescriptionTouchStart={variant === 'mobile' ? handleProxyFocusAssistTouchStart : undefined}
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

        <ProjectSelector
          projects={projects}
          selectedProjectID={editProjectID}
          open={inlineEditOpenControl === 'project'}
          onToggle={() => {
            toggleInlineEditDropdown('project');
          }}
          onProjectChange={setEditProjectID}
          onRequestNewProject={() => {
            setInlineEditOpenControl(null);
            if (showInlineEditProject) { inlineEditProjectInputRef.current?.focus(); }
            else { setShowInlineEditProject(true); }
          }}
          rootRef={editProjectDropdownRef}
          triggerAttributes={{ 'data-inline-edit-menu-trigger': true }}
          dropdownAttributes={{ 'data-inline-edit-menu-boundary': true }}
          searchLabel="Search edit projects"
          closeOnSelect
          showNoProjectOption
          onClose={() => setInlineEditOpenControl(null)}
        />

        <TagSelector
          tags={tags}
          selectedTagIDs={editTaskTagIDs}
          open={inlineEditOpenControl === 'tags'}
          onToggle={() => {
            toggleInlineEditDropdown('tags');
          }}
          onTagIDsChange={setEditTaskTagIDs}
          onRequestNewTag={() => {
            setInlineEditOpenControl(null);
            if (showInlineEditTag) { inlineEditTagInputRef.current?.focus(); }
            else { setShowInlineEditTag(true); }
          }}
          rootRef={editTagDropdownRef}
          triggerAttributes={{ 'data-inline-edit-menu-trigger': true }}
          dropdownAttributes={{ 'data-inline-edit-menu-boundary': true }}
          searchLabel="Search edit tags"
          selectedCountLabel={editTaskTagIDs.length === 0 ? 'Tags' : `${editTaskTagIDs.length} tag${editTaskTagIDs.length !== 1 ? 's' : ''}`}
        />
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
