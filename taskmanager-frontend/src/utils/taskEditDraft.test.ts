import type { Task } from '../types/task';
import { deriveTaskEditDraft } from './taskEditDraft';

function task(overrides: Partial<Task>): Task {
  return {
    taskID: overrides.taskID ?? 1,
    title: overrides.title ?? 'Task',
    description: overrides.description,
    dateTimeScheduled: overrides.dateTimeScheduled ?? null,
    endDateTimeScheduled: overrides.endDateTimeScheduled ?? null,
    recurrenceRuleID: null,
    ...overrides,
  };
}

describe('deriveTaskEditDraft', () => {
  it('uses empty/default fields when a task has no dates or optional metadata', () => {
    expect(deriveTaskEditDraft(task({ title: 'No dates' }), false)).toEqual({
      title: 'No dates',
      description: '',
      priority: '',
      projectID: '',
      date: '',
      hour: '12',
      minute: '00',
      ampm: 'AM',
      showTime: false,
      endHour: '12',
      endMinute: '00',
      endAmpm: 'AM',
      showEndTime: false,
    });
  });

  it('treats midnight scheduled dates as date-only drafts', () => {
    const draft = deriveTaskEditDraft(task({ dateTimeScheduled: '2026-06-04T00:00:00' }), false);

    expect(draft.date).toBe('2026-06-04');
    expect(draft.hour).toBe('12');
    expect(draft.minute).toBe('00');
    expect(draft.ampm).toBe('AM');
    expect(draft.showTime).toBe(false);
  });

  it('hydrates timed start and end fields in 12-hour mode', () => {
    const draft = deriveTaskEditDraft(task({
      title: 'Timed',
      description: 'Details',
      priority: 'HIGH',
      projectID: 42,
      dateTimeScheduled: '2026-06-04T14:05:00',
      endDateTimeScheduled: '2026-06-04T15:35:00',
    }), false);

    expect(draft).toEqual(expect.objectContaining({
      title: 'Timed',
      description: 'Details',
      priority: 'HIGH',
      projectID: 42,
      date: '2026-06-04',
      hour: '02',
      minute: '05',
      ampm: 'PM',
      showTime: true,
      endHour: '03',
      endMinute: '35',
      endAmpm: 'PM',
      showEndTime: true,
    }));
  });

  it('hydrates timed start and end fields in 24-hour mode', () => {
    const draft = deriveTaskEditDraft(task({
      dateTimeScheduled: '2026-06-04T21:40:00',
      endDateTimeScheduled: '2026-06-04T22:10:00',
    }), true);

    expect(draft.hour).toBe('21');
    expect(draft.minute).toBe('40');
    expect(draft.endHour).toBe('22');
    expect(draft.endMinute).toBe('10');
    expect(draft.showTime).toBe(true);
    expect(draft.showEndTime).toBe(true);
  });

  it('normalizes null optional fields to editable empty values', () => {
    const draft = deriveTaskEditDraft(task({
      description: null as unknown as string,
      priority: null,
      projectID: null,
    }), false);

    expect(draft.description).toBe('');
    expect(draft.priority).toBe('');
    expect(draft.projectID).toBe('');
  });
});
