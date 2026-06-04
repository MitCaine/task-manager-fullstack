import type { Project, Tag, Task } from '../types/task';
import { ProjectBadge, TagChip, TagMore } from './TagProjectChips';

type AddTaskPreviewProps = {
  title: string;
  description: string;
  dateTimeLabel: string;
  repeatLabel: string | null;
  priority: Task['priority'];
  priorityLabel: string | null;
  project: Project | null;
  tags: Tag[];
};

function AddTaskPreview({
  title,
  description,
  dateTimeLabel,
  repeatLabel,
  priority,
  priorityLabel,
  project,
  tags,
}: AddTaskPreviewProps) {
  const hasTitle = title.trim().length > 0;
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  return (
    <div className="add-assist">
      <div className="add-preview" aria-label="Task preview">
        <div className="add-preview__top">
          <span className={`add-preview__title${hasTitle ? '' : ' add-preview__title--empty'}`}>
            {trimmedTitle || 'Task title preview'}
          </span>
          <span className="item__meta item__meta--inline">{dateTimeLabel}</span>
        </div>
        {trimmedDescription && <p className="add-preview__desc">{trimmedDescription}</p>}
        {(priority || project || tags.length > 0 || repeatLabel) && (
          <div className="add-preview__chips">
            {project && <ProjectBadge title={project.title} />}
            {repeatLabel && <span className="item__badge item__badge--repeat">{repeatLabel}</span>}
            {priority && priorityLabel && (
              <span className={`item__badge item__badge--priority item__badge--priority-${priority.toLowerCase()}`}>
                {priorityLabel}
              </span>
            )}
            {tags.slice(0, 3).map(tag => (
              <TagChip key={tag.tagID} tag={tag} showDot />
            ))}
            {tags.length > 3 && <TagMore>+{tags.length - 3}</TagMore>}
          </div>
        )}
      </div>
    </div>
  );
}

export default AddTaskPreview;
