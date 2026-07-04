import { useEffect } from 'react';

export type ToastListItem = {
  id: number;
  reminderID?: number;
  taskID?: number;
  taskTitle: string;
  message: string;
  kind?: 'reminder' | 'confirmation';
  autoDismissMs?: number;
};

type ReminderToastListItem = ToastListItem & {
  reminderID: number;
  taskID: number;
};

type ToastListProps = {
  toasts: ToastListItem[];
  onDismiss: (toastId: number) => void;
  onSnooze: (toast: ReminderToastListItem, minutes: number) => void | Promise<void>;
};

function isReminderToast(toast: ToastListItem): toast is ReminderToastListItem {
  return toast.reminderID !== undefined && toast.taskID !== undefined;
}

function ToastList({ toasts, onDismiss, onSnooze }: ToastListProps) {
  useEffect(() => {
    const timers = toasts
      .filter(toast => toast.kind === 'confirmation')
      .map(toast => window.setTimeout(() => onDismiss(toast.id), toast.autoDismissMs ?? 3500));
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  const hasConfirmation = toasts.some(toast => toast.kind === 'confirmation');

  return (
    <div className={`toasts${hasConfirmation ? ' toasts--confirmation' : ''}`}>
      {toasts.map(toast => (
        <div key={toast.id} className={`toast${toast.kind === 'confirmation' ? ' toast--confirmation' : ''}`}>
          <div className="toast__header">
            <span className="toast__title">{toast.kind === 'confirmation' ? '✓' : '⏰'} {toast.taskTitle}</span>
            <button className="toast__close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">×</button>
          </div>
          <p className="toast__msg">{toast.message}</p>
          <div className="toast__actions">
            {isReminderToast(toast) && (
              <>
                <button className="btn btn--ghost btn--sm" onClick={() => onSnooze(toast, 60)}>+1 hr</button>
                <button className="btn btn--ghost btn--sm" onClick={() => onSnooze(toast, 60 * 24)}>Tomorrow</button>
              </>
            )}
            <button className="btn btn--sm" onClick={() => onDismiss(toast.id)}>Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ToastList;
