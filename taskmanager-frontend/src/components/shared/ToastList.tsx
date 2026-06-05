export type ToastListItem = {
  id: number;
  reminderID: number;
  taskID: number;
  taskTitle: string;
  message: string;
};

type ToastListProps = {
  toasts: ToastListItem[];
  onDismiss: (toastId: number) => void;
  onSnooze: (toast: ToastListItem, minutes: number) => void | Promise<void>;
};

function ToastList({ toasts, onDismiss, onSnooze }: ToastListProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toasts">
      {toasts.map(toast => (
        <div key={toast.id} className="toast">
          <div className="toast__header">
            <span className="toast__title">⏰ {toast.taskTitle}</span>
            <button className="toast__close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">×</button>
          </div>
          <p className="toast__msg">{toast.message}</p>
          <div className="toast__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => onSnooze(toast, 60)}>+1 hr</button>
            <button className="btn btn--ghost btn--sm" onClick={() => onSnooze(toast, 60 * 24)}>Tomorrow</button>
            <button className="btn btn--sm" onClick={() => onDismiss(toast.id)}>Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ToastList;
