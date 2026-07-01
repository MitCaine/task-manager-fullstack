import { normalizeTaskStatus, TASK_STATUS } from './taskUtils';

describe('normalizeTaskStatus', () => {
  test('normalizes legacy active status to null', () => {
    expect(normalizeTaskStatus(TASK_STATUS.LEGACY_ACTIVE)).toBeNull();
  });

  test('preserves known non-active statuses', () => {
    expect(normalizeTaskStatus(TASK_STATUS.DONE)).toBe(TASK_STATUS.DONE);
    expect(normalizeTaskStatus(TASK_STATUS.IN_PROGRESS)).toBe(TASK_STATUS.IN_PROGRESS);
  });

  test('normalizes nullish values to null', () => {
    expect(normalizeTaskStatus(null)).toBeNull();
    expect(normalizeTaskStatus(undefined)).toBeNull();
  });
});
