import type { Dispatch, KeyboardEventHandler, MouseEvent, RefObject, SetStateAction } from 'react';
import type { Project, Tag } from '../../types/task';
import type { Ampm } from '../../utils/taskForm';
import type { RepeatValue } from '../../utils/taskRecurrence';
import { compactText } from '../../utils/taskDisplay';
import { findProjectById, formatPriorityLabel } from '../../utils/taskDisplayHelpers';
import ErrorBanner from '../shared/ErrorBanner';
import PrioritySelector from '../shared/PrioritySelector';
import SearchableCatalogList from '../shared/SearchableCatalogList';
import TagColorPicker from '../forms/TagColorPicker';
import InlineProjectForm from '../forms/InlineProjectForm';
import InlineTagForm from '../forms/InlineTagForm';
import SelectedProjectChip from './SelectedProjectChip';
import { SelectedTagChips } from './TagProjectChips';
import TaskEditorFields from './TaskEditorFields';
import AddTaskPreview from './AddTaskPreview';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
type CreateOpenControl = string | null;

export type CreateTaskCardProps = {
  error: string | null;
  onDismissError: () => void;
  controlsRef: RefObject<HTMLDivElement>;
  titleValue: string;
  onTitleChange: (value: string) => void;
  titleInputRef: RefObject<HTMLInputElement>;
  titleHasError: boolean;
  titleWarningMessage: string | null;
  onTitleKeyDown: KeyboardEventHandler<HTMLInputElement>;
  descriptionValue: string;
  onDescriptionChange: (value: string) => void;
  date: string;
  hour: string;
  minute: string;
  ampm: Ampm;
  onDateChange: (value: string) => void;
  onHourChange: (value: string) => void;
  onMinuteChange: (value: string) => void;
  onAmpmChange: (value: Ampm) => void;
  showTime: boolean;
  onToggleTime: () => void;
  onRemoveStartTime: () => void;
  showEndTime: boolean;
  onToggleEndTime: () => void;
  endHour: string;
  endMinute: string;
  endAmpm: Ampm;
  onEndHourChange: (value: string) => void;
  onEndMinuteChange: (value: string) => void;
  onEndAmpmChange: (value: Ampm) => void;
  openTimeEditorScope: string | null;
  setOpenTimeEditorScope: (value: string | null) => void;
  closeFloatingControls: () => void;
  is24Hour: boolean;
  hourOptions: string[];
  openCreateControl: CreateOpenControl;
  setOpenCreateControl: (value: CreateOpenControl) => void;
  dateDisplayLabel: string;
  repeatValue: RepeatValue;
  onRepeatChange: (value: RepeatValue) => void;
  onToggleRepeat: () => void;
  timeRangeError: string | null;
  priority: Priority | '';
  priorityColors: Record<string, string>;
  onTogglePriority: () => void;
  onPriorityChange: (value: Priority | '') => void;
  priorityDropdownRef: RefObject<HTMLDivElement>;
  projects: Project[];
  selectedProjectID: number | '';
  onToggleProject: () => void;
  onProjectChange: (value: number | '') => void;
  onRequestNewProject: () => void;
  onDeleteProject: (projectID: number) => void;
  projectDropdownRef: RefObject<HTMLDivElement>;
  tags: Tag[];
  selectedTagIDs: number[];
  onToggleTags: () => void;
  onTagIDsChange: (updater: (previous: number[]) => number[]) => void;
  onRequestNewTag: () => void;
  onDeleteTag: (tagID: number) => void;
  tagDropdownRef: RefObject<HTMLDivElement>;
  colorPickerTagId: number | null;
  onToggleTagColorPicker: (tagID: number) => void;
  onChangeTagColor: (tagID: number, color: string, event: MouseEvent<HTMLButtonElement>) => void;
  tagColors: string[];
  showInlineProject: boolean;
  inlineProjectInputRef: RefObject<HTMLInputElement>;
  newProjectTitle: string;
  projectMaxLength: number;
  onNewProjectTitleChange: (value: string) => void;
  onSubmitProject: () => void;
  onCancelProject: () => void;
  showInlineTag: boolean;
  inlineTagInputRef: RefObject<HTMLInputElement>;
  newTagTitle: string;
  newTagColor: string;
  tagMaxLength: number;
  onNewTagTitleChange: (value: string) => void;
  onSubmitTag: () => void;
  onCancelTag: () => void;
  onNewTagColorChange: (value: string) => void;
  onAddTask: () => void;
  previewDateTimeLabel: string;
  previewRepeatLabel: string | null;
  previewProject: Project | null;
  previewTags: Tag[];
};

export default function CreateTaskCard({
  error,
  onDismissError,
  controlsRef,
  titleValue,
  onTitleChange,
  titleInputRef,
  titleHasError,
  titleWarningMessage,
  onTitleKeyDown,
  descriptionValue,
  onDescriptionChange,
  date,
  hour,
  minute,
  ampm,
  onDateChange,
  onHourChange,
  onMinuteChange,
  onAmpmChange,
  showTime,
  onToggleTime,
  onRemoveStartTime,
  showEndTime,
  onToggleEndTime,
  endHour,
  endMinute,
  endAmpm,
  onEndHourChange,
  onEndMinuteChange,
  onEndAmpmChange,
  openTimeEditorScope,
  setOpenTimeEditorScope,
  closeFloatingControls,
  is24Hour,
  hourOptions,
  openCreateControl,
  setOpenCreateControl,
  dateDisplayLabel,
  repeatValue,
  onRepeatChange,
  onToggleRepeat,
  timeRangeError,
  priority,
  priorityColors,
  onTogglePriority,
  onPriorityChange,
  priorityDropdownRef,
  projects,
  selectedProjectID,
  onToggleProject,
  onProjectChange,
  onRequestNewProject,
  onDeleteProject,
  projectDropdownRef,
  tags,
  selectedTagIDs,
  onToggleTags,
  onTagIDsChange,
  onRequestNewTag,
  onDeleteTag,
  tagDropdownRef,
  colorPickerTagId,
  onToggleTagColorPicker,
  onChangeTagColor,
  tagColors,
  showInlineProject,
  inlineProjectInputRef,
  newProjectTitle,
  projectMaxLength,
  onNewProjectTitleChange,
  onSubmitProject,
  onCancelProject,
  showInlineTag,
  inlineTagInputRef,
  newTagTitle,
  newTagColor,
  tagMaxLength,
  onNewTagTitleChange,
  onSubmitTag,
  onCancelTag,
  onNewTagColorChange,
  onAddTask,
  previewDateTimeLabel,
  previewRepeatLabel,
  previewProject,
  previewTags,
}: CreateTaskCardProps): JSX.Element {
  const setDateTimeRowOpenScope: Dispatch<SetStateAction<string | null>> = value => {
    setOpenTimeEditorScope(typeof value === 'function' ? value(openTimeEditorScope) : value);
  };
  const setDateTimeRowOpenControl: Dispatch<SetStateAction<string | null>> = value => {
    setOpenCreateControl(typeof value === 'function' ? value(openCreateControl) : value);
  };

  return (
    <div className="card app__add" data-text-focus-scope="create-task">
      {error && <ErrorBanner message={error} onDismiss={onDismissError} />}

      <div className="controls" ref={controlsRef}>
        <TaskEditorFields
          titleValue={titleValue}
          onTitleChange={onTitleChange}
          titleInputRef={titleInputRef}
          titleClassName={`input${titleHasError ? ' input--error' : ''}`}
          titleType="text"
          onTitleKeyDown={onTitleKeyDown}
          titleErrorMessage={titleHasError ? 'Title is required.' : null}
          titleWarningMessage={titleWarningMessage}
          descriptionValue={descriptionValue}
          onDescriptionChange={onDescriptionChange}
          descriptionPlaceholder="Description (optional)"
          descriptionRows={2}
          dateTimeRowProps={{
            editorScope: 'add-task',
            openTimeEditorScope,
            setOpenTimeEditorScope: setDateTimeRowOpenScope,
            closeFloatingControls,
            is24Hour,
            hourOptions,
            openControl: openCreateControl,
            setOpenControl: setDateTimeRowOpenControl,
            controlIds: {
              date: 'date',
              start: 'start',
              end: 'end',
              startHour: 'start-hour',
              startMinute: 'start-minute',
              startAmpm: 'start-ampm',
              endHour: 'end-hour',
              endMinute: 'end-minute',
              endAmpm: 'end-ampm',
            },
            dateVal: date,
            hourVal: hour,
            minuteVal: minute,
            ampmVal: ampm,
            onDate: onDateChange,
            onHour: onHourChange,
            onMinute: onMinuteChange,
            onAmpm: onAmpmChange,
            useDateDisplayProxy: true,
            dateDisplayLabel,
            showTime,
            onToggleTime,
            onRemoveStart: onRemoveStartTime,
            showEndTime,
            onToggleEndTime,
            endHourVal: endHour,
            endMinuteVal: endMinute,
            endAmpmVal: endAmpm,
            onEndHour: onEndHourChange,
            onEndMinute: onEndMinuteChange,
            onEndAmpm: onEndAmpmChange,
          }}
          recurrenceControlProps={{
            value: repeatValue,
            onChange: onRepeatChange,
            openControl: openCreateControl,
            onToggle: onToggleRepeat,
            onClose: () => setOpenCreateControl(null),
            controlId: 'repeat',
            menuScope: 'create',
          }}
          timeRangeError={timeRangeError}
        />
        <div className="add-actions-row">
          <div className="form-row">
            <PrioritySelector
              value={priority}
              colors={priorityColors}
              open={openCreateControl === 'priority'}
              onToggle={onTogglePriority}
              onSelect={value => { onPriorityChange(value); setOpenCreateControl(null); }}
              triggerLabel="Priority"
              removeLabel="Remove priority"
              rootRef={priorityDropdownRef}
              triggerAttributes={{ 'data-create-menu-trigger': true }}
              dropdownAttributes={{ 'data-create-menu-boundary': true }}
            />
            <div className="tag-select" ref={projectDropdownRef}>
              <button
                type="button"
                className={`select tag-select__btn${selectedProjectID !== '' ? ' tag-select__btn--active' : ''}`}
                data-create-menu-trigger
                onClick={onToggleProject}
              >
                {selectedProjectID === ''
                  ? 'Project'
                  : compactText(findProjectById(projects, selectedProjectID)?.title ?? 'Project', 10)}
              </button>
              {openCreateControl === 'project' && (
                <div className="tag-select__dropdown" data-create-menu-boundary>
                  <button
                    type="button"
                    className="tag-select__new-btn tag-select__new-btn--top"
                    onClick={onRequestNewProject}
                  >+ New Project</button>
                  <SearchableCatalogList
                    items={projects}
                    searchLabel="Search create projects"
                    searchPlaceholder="Search projects..."
                    emptyMessage="No projects yet."
                    noMatchesMessage="No projects match your search."
                    renderItem={p => {
                      const selected = selectedProjectID === p.projectID;
                      return (
                        <div key={p.projectID} className={`tag-select__item${selected ? ' tag-select__item--on' : ''}`}>
                          <label className="tag-select__item-label">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => onProjectChange(selected ? '' : p.projectID)}
                            />
                            📁 {p.title}
                          </label>
                          <button
                            type="button"
                            className="tag-select__delete"
                            onClick={e => { e.stopPropagation(); onDeleteProject(p.projectID); }}
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
            <div className="tag-select tag-select--create-tags" ref={tagDropdownRef}>
              <button
                type="button"
                className={`select tag-select__btn${selectedTagIDs.length > 0 ? ' tag-select__btn--active' : ''}`}
                data-create-menu-trigger
                onClick={onToggleTags}
              >
                {selectedTagIDs.length === 0
                  ? 'Tags'
                  : `${selectedTagIDs.length} Tag${selectedTagIDs.length === 1 ? '' : 's'}`}
              </button>
              {openCreateControl === 'tags' && (
                <div className="tag-select__dropdown" data-create-menu-boundary>
                  <button
                    type="button"
                    className="tag-select__new-btn tag-select__new-btn--top"
                    onClick={onRequestNewTag}
                  >+ New Tag</button>
                  <SearchableCatalogList
                    items={tags}
                    searchLabel="Search create tags"
                    searchPlaceholder="Search tags..."
                    emptyMessage="No tags yet."
                    noMatchesMessage="No tags match your search."
                    isItemSelected={tag => selectedTagIDs.includes(tag.tagID)}
                    renderItem={tag => {
                      const selected = selectedTagIDs.includes(tag.tagID);
                      return (
                        <div key={tag.tagID}>
                          <div className={`tag-select__item${selected ? ' tag-select__item--on' : ''}`}>
                            <label className="tag-select__item-label">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => onTagIDsChange(previous =>
                                  selected ? previous.filter(id => id !== tag.tagID) : [...previous, tag.tagID]
                                )}
                              />
                              {tag.title}
                            </label>
                            <button
                              type="button"
                              className="tag-dot tag-dot--clickable"
                              style={{ background: tag.color ?? '#6366f1' }}
                              onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleTagColorPicker(tag.tagID); }}
                              title="Change color"
                              aria-label="Change tag color"
                            />
                            <button
                              type="button"
                              className="tag-select__delete"
                              onClick={e => { e.stopPropagation(); onDeleteTag(tag.tagID); }}
                              title="Delete tag"
                              aria-label="Delete tag"
                            >×</button>
                          </div>
                          {colorPickerTagId === tag.tagID && (
                            <TagColorPicker
                              colors={tagColors}
                              selectedColor={tag.color}
                              onSelectColor={(c, e) => onChangeTagColor(tag.tagID, c, e)}
                              className="tag-color-picker"
                              getAriaLabel={c => `Set tag color ${c}`}
                            />
                          )}
                        </div>
                      );
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <button className="btn add-task-submit" onClick={onAddTask}>Add Task</button>
        </div>
        <SelectedProjectChip
          project={selectedProjectID !== '' ? findProjectById(projects, selectedProjectID) ?? null : null}
          onRemove={() => onProjectChange('')}
        />
        <SelectedTagChips
          tagIds={selectedTagIDs}
          tags={tags}
          onRemove={id => onTagIDsChange(previous => previous.filter(i => i !== id))}
        />
        {showInlineProject && (
          <InlineProjectForm
            inputRef={inlineProjectInputRef}
            value={newProjectTitle}
            maxLength={projectMaxLength}
            placeholder="Project name…"
            onChange={onNewProjectTitleChange}
            onSubmit={onSubmitProject}
            onCancel={onCancelProject}
          />
        )}
        {showInlineTag && (
          <InlineTagForm
            inputRef={inlineTagInputRef}
            value={newTagTitle}
            selectedColor={newTagColor}
            colors={tagColors}
            maxLength={tagMaxLength}
            placeholder="Tag name…"
            onChange={onNewTagTitleChange}
            onSubmit={onSubmitTag}
            onCancel={onCancelTag}
            onSelectColor={onNewTagColorChange}
            getColorAriaLabel={c => `Set new tag color ${c}`}
          />
        )}
        <AddTaskPreview
          title={titleValue}
          description={descriptionValue}
          dateTimeLabel={previewDateTimeLabel}
          repeatLabel={previewRepeatLabel}
          priority={priority || null}
          priorityLabel={priority ? formatPriorityLabel(priority) : null}
          project={previewProject}
          tags={previewTags}
        />
      </div>
    </div>
  );
}
