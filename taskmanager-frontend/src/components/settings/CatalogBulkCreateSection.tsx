import { CatalogManagerColorControl } from './CatalogManagerItemRow';

type CatalogSection = 'projects' | 'tags';

type CatalogBulkCreateSectionProps = {
  section: CatalogSection;
  addText: string;
  addSummary: string;
  newTagColor: string;
  addPlaceholder: string;
  addLabel: string;
  createLabel: string;
  onAddTextChange: (value: string) => void;
  onNewTagColorChange: (value: string) => void;
  onCreateItems: () => void;
};

export default function CatalogBulkCreateSection({
  section,
  addText,
  addSummary,
  newTagColor,
  addPlaceholder,
  addLabel,
  createLabel,
  onAddTextChange,
  onNewTagColorChange,
  onCreateItems,
}: CatalogBulkCreateSectionProps): JSX.Element {
  return (
    <>
      <div className={`catalog-manager__create catalog-manager__create--${section}`}>
        <textarea
          id={`catalog-manager-create-${section}`}
          className="input catalog-manager__create-input"
          value={addText}
          onChange={event => onAddTextChange(event.currentTarget.value)}
          placeholder={addPlaceholder}
          aria-label={addLabel}
          rows={3}
        />
        <div className={`catalog-manager__create-actions catalog-manager__create-actions--${section}`}>
          <button className="btn catalog-manager__create-button" onClick={onCreateItems} disabled={!addText.trim()}>
            {createLabel}
          </button>
          {section === 'tags' && (
            <CatalogManagerColorControl
              value={newTagColor}
              onChange={onNewTagColorChange}
              ariaLabel="New tag color"
            />
          )}
        </div>
      </div>
      {addSummary && <div className="catalog-manager__create-summary" role="status">{addSummary}</div>}
    </>
  );
}
