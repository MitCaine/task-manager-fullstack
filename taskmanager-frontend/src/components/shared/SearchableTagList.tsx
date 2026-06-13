import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Tag } from '../../types/task';

type SearchableTagListProps = {
  tags: Tag[];
  searchLabel: string;
  renderTag: (tag: Tag) => ReactNode;
  emptyMessage?: string;
  noMatchesMessage?: string;
};

export default function SearchableTagList({
  tags,
  searchLabel,
  renderTag,
  emptyMessage = 'No tags yet.',
  noMatchesMessage = 'No tags match your search.',
}: SearchableTagListProps): JSX.Element {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredTags = useMemo(
    () => normalizedQuery === ''
      ? tags
      : tags.filter(tag => tag.title.toLocaleLowerCase().includes(normalizedQuery)),
    [normalizedQuery, tags],
  );

  return (
    <>
      <input
        type="search"
        className="input tag-select__search"
        value={query}
        onChange={event => setQuery(event.currentTarget.value)}
        placeholder="Search tags..."
        aria-label={searchLabel}
      />
      {tags.length === 0
        ? <p className="tag-select__empty">{emptyMessage}</p>
        : filteredTags.length === 0
          ? <p className="tag-select__empty">{noMatchesMessage}</p>
          : filteredTags.map(renderTag)}
    </>
  );
}
