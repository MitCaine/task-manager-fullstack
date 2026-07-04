import {
  resetLegacyIdMappingsForTests,
  toDomainEntityId,
  toLegacyNumericId,
} from './legacyIdAdapter';

describe('toLegacyNumericId', () => {
  beforeEach(() => {
    resetLegacyIdMappingsForTests();
  });

  it('converts numeric domain IDs to legacy numeric IDs', () => {
    expect(toLegacyNumericId('42', 'taskID')).toBe(42);
    expect(toDomainEntityId(42)).toBe('42');
  });

  it('maps non-numeric domain IDs to stable synthetic legacy IDs', () => {
    const first = toLegacyNumericId('task-uuid', 'taskID');
    const second = toLegacyNumericId('task-uuid', 'taskID');

    expect(first).toBeLessThan(0);
    expect(second).toBe(first);
    expect(toDomainEntityId(first)).toBe('task-uuid');
    expect(toDomainEntityId(String(first))).toBe('task-uuid');
  });

  it('keeps unknown numeric legacy IDs compatible with REST IDs', () => {
    expect(toDomainEntityId(123)).toBe('123');
  });
});
