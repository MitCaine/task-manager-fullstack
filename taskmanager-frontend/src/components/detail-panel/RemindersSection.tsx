import type { ChangeEvent } from 'react';
import type { Reminder } from '../../types/task';
import DateTimeRow from '../shared/DateTimeRow';
import type { DateTimeRowProps } from '../shared/DateTimeRow';

type RemindersSectionProps = {
  reminders: Reminder[];
  dateTimeRowProps: DateTimeRowProps;
  newReminderMessage: string;
  onReminderMessageChange: (value: string) => void;
  onAddReminder: () => void;
  onRemoveReminder: (reminderId: number) => void;
  formatDateTime: (dateTime: string) => string;
};

function RemindersSection({
  reminders,
  dateTimeRowProps,
  newReminderMessage,
  onReminderMessageChange,
  onAddReminder,
  onRemoveReminder,
  formatDateTime,
}: RemindersSectionProps) {
  const handleReminderMessageChange = (event: ChangeEvent<HTMLInputElement>) => {
    onReminderMessageChange(event.target.value);
  };

  return (
    <>
      <div className="sec-panel__add sec-panel__add--col">
        <DateTimeRow {...dateTimeRowProps} />
        <input className="input" placeholder="Reminder message (optional)…" aria-label="Reminder message" value={newReminderMessage} onChange={handleReminderMessageChange} />
        <button className="btn btn--sm" onClick={onAddReminder}>Add Reminder</button>
      </div>
      {reminders.length === 0
        ? <p className="sec-panel__empty">No reminders yet.</p>
        : reminders.map(reminder => (
          <div key={reminder.reminderID} className="sec-row">
            <div className="sec-row__body">
              <span className="sec-row__title">{formatDateTime(reminder.dueDate)}</span>
              {reminder.message && <span className="sec-row__sub">{reminder.message}</span>}
            </div>
            <button className="btn btn--danger btn--icon" onClick={() => onRemoveReminder(reminder.reminderID)} aria-label="Delete reminder">✕</button>
          </div>
        ))
      }
    </>
  );
}

export default RemindersSection;
