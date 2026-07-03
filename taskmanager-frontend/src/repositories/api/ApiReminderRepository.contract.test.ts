import { createReminder, deleteReminder, getReminders, patchReminderDate } from '../../api/tasks';
import type { Reminder } from '../../types/task';
import { describeReminderRepositoryContract } from '../contracts/reminderRepositoryContract';
import { ApiReminderRepository } from './ApiReminderRepository';

jest.mock('../../api/tasks');

const mockGetReminders = getReminders as jest.MockedFunction<typeof getReminders>;
const mockCreateReminder = createReminder as jest.MockedFunction<typeof createReminder>;
const mockPatchReminderDate = patchReminderDate as jest.MockedFunction<typeof patchReminderDate>;
const mockDeleteReminder = deleteReminder as jest.MockedFunction<typeof deleteReminder>;

let nextReminderId = 100;
const reminderStore = new Map<number, Reminder>();
const deletedReminderIds = new Set<number>();

function installReminderApiMocks() {
  mockGetReminders.mockImplementation(async taskId => (
    Array.from(reminderStore.values()).filter(reminder => reminder.taskID === taskId)
  ));
  mockCreateReminder.mockImplementation(async (taskId, dueDate, message) => {
    const reminder: Reminder = {
      reminderID: nextReminderId++,
      taskID: taskId,
      dueDate,
      notificationMethod: 'browser',
      message,
    };
    reminderStore.set(reminder.reminderID, reminder);
    return reminder;
  });
  mockPatchReminderDate.mockImplementation(async (id, dueDate) => {
    const current = reminderStore.get(id);
    if (!current) throw new Error(`Reminder ${id} not found`);
    const reminder: Reminder = { ...current, dueDate };
    reminderStore.set(id, reminder);
    return reminder;
  });
  mockDeleteReminder.mockImplementation(async id => {
    deletedReminderIds.add(id);
    reminderStore.delete(id);
  });
}

beforeEach(() => {
  nextReminderId = 100;
  reminderStore.clear();
  deletedReminderIds.clear();
  jest.clearAllMocks();
  installReminderApiMocks();
});

describeReminderRepositoryContract({
  createRepository: () => new ApiReminderRepository(),
  seedReminder: reminder => {
    reminderStore.set(Number(reminder.id), {
      reminderID: Number(reminder.id),
      taskID: Number(reminder.taskId),
      dueDate: reminder.dueDate,
      notificationMethod: reminder.notificationMethod ?? 'browser',
      message: reminder.message,
    });
  },
  expectDeleted: id => {
    expect(deletedReminderIds.has(Number(id))).toBe(true);
  },
});
