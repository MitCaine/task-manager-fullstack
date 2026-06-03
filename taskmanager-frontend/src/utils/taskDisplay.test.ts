import { compactText, normalizeTaskStatus } from './taskDisplay';

describe('normalizeTaskStatus', () => {
  test('normalizes legacy active status to null', () => {
    expect(normalizeTaskStatus(1)).toBeNull();
  });

  test('preserves known non-active statuses', () => {
    expect(normalizeTaskStatus(2)).toBe(2);
    expect(normalizeTaskStatus(3)).toBe(3);
  });

  test('normalizes nullish values to null', () => {
    expect(normalizeTaskStatus(null)).toBeNull();
    expect(normalizeTaskStatus(undefined)).toBeNull();
  });
});

describe('compactText', () => {
  test('returns short text unchanged', () => {
    expect(compactText('Project', 10)).toBe('Project');
  });

  test('truncates long text with an ellipsis', () => {
    expect(compactText('Long project title', 8)).toBe('Long pr…');
  });
});
