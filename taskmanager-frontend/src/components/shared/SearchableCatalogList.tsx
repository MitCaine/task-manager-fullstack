import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type TitledCatalogItem = {
  title: string;
};

type SearchableCatalogListProps<T extends TitledCatalogItem> = {
  items: T[];
  searchLabel: string;
  searchPlaceholder: string;
  renderItem: (item: T) => ReactNode;
  isItemSelected?: (item: T) => boolean;
  emptyMessage: string;
  noMatchesMessage: string;
  createFromQueryLabel?: (query: string) => string;
  onCreateFromQuery?: (query: string) => void;
};

export default function SearchableCatalogList<T extends TitledCatalogItem>({
  items,
  searchLabel,
  searchPlaceholder,
  renderItem,
  isItemSelected,
  emptyMessage,
  noMatchesMessage,
  createFromQueryLabel,
  onCreateFromQuery,
}: SearchableCatalogListProps<T>): JSX.Element {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredItems = useMemo(
    () => normalizedQuery === ''
      ? items
      : items.filter(item => item.title.toLocaleLowerCase().includes(normalizedQuery)),
    [items, normalizedQuery],
  );
  const orderedItems = isItemSelected
    ? [
        ...filteredItems.filter(isItemSelected),
        ...filteredItems.filter(item => !isItemSelected(item)),
      ]
    : filteredItems;
  const createAction = normalizedQuery !== '' && createFromQueryLabel && onCreateFromQuery ? (
    <button
      type="button"
      className="tag-select__new-btn tag-select__new-btn--search"
      onClick={() => onCreateFromQuery(query)}
    >
      {createFromQueryLabel(query)}
    </button>
  ) : null;

  return (
    <>
      <input
        type="search"
        className="input tag-select__search"
        value={query}
        onChange={event => setQuery(event.currentTarget.value)}
        placeholder={searchPlaceholder}
        aria-label={searchLabel}
      />
      {items.length === 0
        ? (
            <>
              {createAction}
              <p className="tag-select__empty">{normalizedQuery === '' ? emptyMessage : noMatchesMessage}</p>
            </>
          )
        : orderedItems.length === 0
          ? (
              <>
                {createAction}
                <p className="tag-select__empty">{noMatchesMessage}</p>
              </>
            )
          : orderedItems.map(renderItem)}
    </>
  );
}
