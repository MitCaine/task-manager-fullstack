import type { Tag } from '../../types/task';
import { TagChip, TagMore } from './TagProjectChips';

export type TaskTagsProps = {
  taskId: number;
  tags?: Tag[] | null;
  expanded: boolean;
  onToggle: (taskId: number) => void;
  extraClass?: string;
  visibleTagCount?: number;
};

export default function TaskTags({
  taskId,
  tags = [],
  expanded,
  onToggle,
  extraClass = '',
  visibleTagCount = 2,
}: TaskTagsProps): JSX.Element | null {
  const taskTags = tags ?? [];
  if (taskTags.length === 0) return null;

  const visibleTags = expanded ? taskTags : taskTags.slice(0, visibleTagCount);
  const hiddenCount = taskTags.length - visibleTags.length;

  return (
    <div className={`item__chips${extraClass ? ` ${extraClass}` : ''}`}>
      {visibleTags.map(tag => (
        <TagChip key={tag.tagID} tag={tag} />
      ))}
      {taskTags.length > visibleTagCount && (
        <TagMore
          button
          onClick={e => { e.stopPropagation(); onToggle(taskId); }}
          ariaExpanded={expanded}
        >
          {expanded ? 'Show less ▲' : `+${hiddenCount} ▼`}
        </TagMore>
      )}
    </div>
  );
}
