import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import type { Tag } from '../../types/task';

function tagAccentStyle(color?: string | null): CSSProperties {
  return { '--tag-color': color ?? '#6366f1' } as CSSProperties;
}

export function ProjectBadge({ title }: { title: string }): JSX.Element {
  return <span className="item__badge item__project-chip">{title}</span>;
}

export function TagChip({ tag, showDot = false }: { tag: Tag; showDot?: boolean }): JSX.Element {
  return (
    <span className="item__tag-chip" style={tagAccentStyle(tag.color)}>
      {showDot && <span className="tag-dot" style={{ background: tag.color ?? '#6366f1' }} />}
      {tag.title}
    </span>
  );
}

export function TagMore({
  children,
  button = false,
  onClick,
  ariaExpanded,
}: {
  children: ReactNode;
  button?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  ariaExpanded?: boolean;
}): JSX.Element {
  if (button) {
    return (
      <button type="button" className="item__tag-more" onClick={onClick} aria-expanded={ariaExpanded}>
        {children}
      </button>
    );
  }
  return <span className="item__tag-more">{children}</span>;
}

export function SelectedTagChips({
  tagIds,
  tags,
  onRemove,
  className,
}: {
  tagIds: number[];
  tags: Tag[];
  onRemove: (tagID: number) => void;
  className?: string;
}): JSX.Element | null {
  if (tagIds.length === 0) return null;

  return (
    <div className={`selected-tags${className ? ` ${className}` : ''}`}>
      {tagIds.map(id => {
        const tag = tags.find(t => t.tagID === id);
        if (!tag) return null;
        return (
          <span key={id} className="selected-tag-chip" style={tagAccentStyle(tag.color)}>
            <span className="tag-dot" style={{ background: tag.color ?? '#6366f1' }} />
            {tag.title}
            <button
              type="button"
              className="selected-tag-chip__remove"
              onClick={() => onRemove(id)}
              aria-label={`Remove tag ${tag.title}`}
            >×</button>
          </span>
        );
      })}
    </div>
  );
}
