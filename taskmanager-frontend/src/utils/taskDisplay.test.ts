import { compactText } from './taskDisplay';

describe('compactText', () => {
  test('returns short text unchanged', () => {
    expect(compactText('Project', 10)).toBe('Project');
  });

  test('truncates long text with an ellipsis', () => {
    expect(compactText('Long project title', 8)).toBe('Long pr…');
  });
});
