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
  emptyMessage: string;
  noMatchesMessage: string;
};

export default function SearchableCatalogList<T extends TitledCatalogItem>({
  items,
  searchLabel,
  searchPlaceholder,
  renderItem,
  emptyMessage,
  noMatchesMessage,
}: SearchableCatalogListProps<T>): JSX.Element {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredItems = useMemo(
    () => normalizedQuery === ''
      ? items
      : items.filter(item => item.title.toLocaleLowerCase().includes(normalizedQuery)),
    [items, normalizedQuery],
  );

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
        ? <p className="tag-select__empty">{emptyMessage}</p>
        : filteredItems.length === 0
          ? <p className="tag-select__empty">{noMatchesMessage}</p>
          : filteredItems.map(renderItem)}
    </>
  );
}
