import type { ChangeEvent, TouchEvent } from 'react';

type CatalogSection = 'projects' | 'tags';

type CatalogManagerItemRowProps = {
  kind: CatalogSection;
  title: string;
  usageCount: number;
  selected: boolean;
  editing: boolean;
  color?: string | null;
  editingTitle: string;
  editingColor: string;
  onToggleSelection: () => void;
  onEditingTitleChange: (value: string) => void;
  onEditingColorChange: (value: string) => void;
  onRenameTouchStart: (event: TouchEvent<HTMLInputElement>) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onBeginEdit: () => void;
  onRequestDelete: () => void;
};

const usageLabel = (count: number) => `${count} task${count === 1 ? '' : 's'}`;

type CatalogManagerColorControlProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
};

export function CatalogManagerColorControl({
  value,
  onChange,
  ariaLabel,
}: CatalogManagerColorControlProps): JSX.Element {
  return (
    <label className="catalog-manager__color-control">
      <input
        className="catalog-manager__color-input"
        type="color"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value)}
        aria-label={ariaLabel}
      />
      <span className="catalog-manager__color-swatch" style={{ background: value }} aria-hidden="true" />
      <span>Tag Color</span>
    </label>
  );
}

export default function CatalogManagerItemRow({
  kind,
  title,
  usageCount,
  selected,
  editing,
  color,
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
}: CatalogManagerItemRowProps): JSX.Element {
  const singular = kind === 'projects' ? 'project' : 'tag';
  const resolvedColor = color ?? '#6366f1';

  return (
    <li className={`catalog-manager__item catalog-manager__item--${singular}${editing ? ' catalog-manager__item--editing' : ''}`}>
      {!editing && (
        <input
          type="checkbox"
          className="catalog-manager__select"
          checked={selected}
          onChange={onToggleSelection}
          aria-label={`Select ${singular} ${title}`}
        />
      )}
      <div className="catalog-manager__main">
        {kind === 'tags' && !editing && <span className="tag-dot" style={{ background: resolvedColor }} />}
        {editing
          ? (
            <input
              type="text"
              className="input catalog-manager__edit-input"
              value={editingTitle}
              onChange={event => onEditingTitleChange(event.currentTarget.value)}
              onTouchStart={onRenameTouchStart}
              aria-label={`Rename ${singular} ${title}`}
            />
          )
          : <span className="catalog-manager__name">{title}</span>}
        {kind === 'tags' && editing && (
          <CatalogManagerColorControl
            value={editingColor}
            onChange={onEditingColorChange}
            ariaLabel={`Color for tag ${title}`}
          />
        )}
        {!editing && <span className="catalog-manager__usage">{usageLabel(usageCount)}</span>}
      </div>
      <div className="catalog-manager__actions">
        {editing ? (
          <>
            <button className="btn btn--sm" onClick={onSaveEdit}>Save</button>
            <button className="btn btn--ghost btn--sm" onClick={onCancelEdit}>Cancel</button>
            <button className="btn btn--danger btn--sm" onClick={onRequestDelete}>Delete</button>
          </>
        ) : (
          <>
            <button className="btn btn--ghost btn--sm" onClick={onBeginEdit}>Edit</button>
            <button className="btn btn--danger btn--sm" onClick={onRequestDelete}>Delete</button>
          </>
        )}
      </div>
    </li>
  );
}
