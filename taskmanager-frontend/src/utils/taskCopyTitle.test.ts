import { nextCopyTitle, parseCopyTitle } from './taskCopyTitle';

describe('parseCopyTitle', () => {
  it('parses the first copy title', () => {
    expect(parseCopyTitle('Title (copy)')).toEqual({ baseTitle: 'Title', copyNumber: 1 });
  });

  it('parses numbered copy titles', () => {
    expect(parseCopyTitle('Title (copy 3)')).toEqual({ baseTitle: 'Title', copyNumber: 3 });
  });

  it('ignores non-copy titles and invalid copy numbers', () => {
    expect(parseCopyTitle('Title')).toBeNull();
    expect(parseCopyTitle('Title (copy 0)')).toBeNull();
  });
});

describe('nextCopyTitle', () => {
  it('creates the first copy title', () => {
    expect(nextCopyTitle('Title', ['Title'])).toBe('Title (copy)');
  });

  it('avoids collisions across multiple existing copies', () => {
    expect(nextCopyTitle('Title', ['Title', 'Title (copy)', 'Title (copy 2)'])).toBe('Title (copy 3)');
  });

  it('fills the first missing copy number', () => {
    expect(nextCopyTitle('Title', ['Title (copy)', 'Title (copy 3)'])).toBe('Title (copy 2)');
  });

  it('uses the base title when duplicating an existing numbered copy', () => {
    expect(nextCopyTitle('Title (copy 2)', ['Title (copy)', 'Title (copy 2)'])).toBe('Title (copy 3)');
  });

  it('handles titles containing parentheses', () => {
    expect(nextCopyTitle('Title (work)', ['Title (work)', 'Title (work) (copy)'])).toBe('Title (work) (copy 2)');
  });
});
