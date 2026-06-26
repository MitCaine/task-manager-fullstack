import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, RefObject } from 'react';
import type { Tag } from '../../types/task';
import SearchableCatalogList from './SearchableCatalogList';

type DataAttributes = Record<`data-${string}`, string | boolean | number | undefined>;

type TagSelectorProps = {
  tags: Tag[];
  selectedTagIDs: number[];
  open: boolean;
  onToggle: () => void;
  onTagIDsChange: (updater: (previous: number[]) => number[]) => void;
  onRequestNewTag: () => void;
  rootRef?: RefObject<HTMLDivElement>;
  rootClassName?: string;
  triggerAttributes?: ButtonHTMLAttributes<HTMLButtonElement> & DataAttributes;
  dropdownAttributes?: HTMLAttributes<HTMLDivElement> & DataAttributes;
  searchLabel: string;
  selectedCountLabel: string;
  renderTagActions?: (tag: Tag) => ReactNode;
  renderTagDetails?: (tag: Tag) => ReactNode;
};

export default function TagSelector({
  tags,
  selectedTagIDs,
  open,
  onToggle,
  onTagIDsChange,
  onRequestNewTag,
  rootRef,
  rootClassName = 'tag-select',
  triggerAttributes,
  dropdownAttributes,
  searchLabel,
  selectedCountLabel,
  renderTagActions,
  renderTagDetails,
}: TagSelectorProps): JSX.Element {
  const toggleTag = (tagID: number, selected: boolean) => {
    onTagIDsChange(previous => selected ? previous.filter(id => id !== tagID) : [...previous, tagID]);
  };

  return (
    <div className={rootClassName} ref={rootRef}>
      <button
        type="button"
        className={`select tag-select__btn${selectedTagIDs.length > 0 ? ' tag-select__btn--active' : ''}`}
        onClick={onToggle}
        {...triggerAttributes}
      >
        {selectedCountLabel}
      </button>
      {open && (
        <div className="tag-select__dropdown" {...dropdownAttributes}>
          <button
            type="button"
            className="tag-select__new-btn tag-select__new-btn--top"
            onClick={onRequestNewTag}
          >+ New Tag</button>
          <SearchableCatalogList
            items={tags}
            searchLabel={searchLabel}
            searchPlaceholder="Search tags..."
            emptyMessage="No tags yet."
            noMatchesMessage="No tags match your search."
            isItemSelected={tag => selectedTagIDs.includes(tag.tagID)}
            renderItem={tag => {
              const selected = selectedTagIDs.includes(tag.tagID);
              if (!renderTagActions) {
                return (
                  <label key={tag.tagID} className={`tag-select__item tag-select__item-label${selected ? ' tag-select__item--on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleTag(tag.tagID, selected)}
                    />
                    <span className="tag-dot" style={{ background: tag.color ?? '#6366f1' }} />
                    {tag.title}
                  </label>
                );
              }

              return (
                <div key={tag.tagID}>
                  <div className={`tag-select__item${selected ? ' tag-select__item--on' : ''}`}>
                    <label className="tag-select__item-label">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleTag(tag.tagID, selected)}
                      />
                      {tag.title}
                    </label>
                    {renderTagActions(tag)}
                  </div>
                  {renderTagDetails?.(tag)}
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
