import { toLegacyNumericId } from './legacyIdAdapter';

describe('toLegacyNumericId', () => {
  it('converts numeric domain IDs to legacy numeric IDs', () => {
    expect(toLegacyNumericId('42', 'taskID')).toBe(42);
  });

  it('throws clearly for non-numeric domain IDs', () => {
    expect(() => toLegacyNumericId('task-uuid', 'taskID')).toThrow(
      'Cannot adapt non-numeric domain taskID "task-uuid" to the legacy numeric UI id.'
    );
  });
});
