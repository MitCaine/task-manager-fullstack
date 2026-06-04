export type RepeatFrequency = '' | 'daily' | 'weekly' | 'monthly';

const REPEAT_OPTIONS: Array<{ value: RepeatFrequency; label: string }> = [
  { value: '', label: 'Do not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function formatRepeatFrequency(value: RepeatFrequency): string {
  return REPEAT_OPTIONS.find(option => option.value === value)?.label ?? 'Do not repeat';
}

export type RecurrenceControlProps = {
  value: RepeatFrequency;
  onChange: (value: RepeatFrequency) => void;
  openControl: string | null;
  onToggle: () => void;
  onClose: () => void;
  controlId: string;
  menuScope: 'create' | 'inline-edit';
};

export default function RecurrenceControl({
  value,
  onChange,
  openControl,
  onToggle,
  onClose,
  controlId,
  menuScope,
}: RecurrenceControlProps): JSX.Element {
  const open = openControl === controlId;
  const triggerAttrs = menuScope === 'create'
    ? { 'data-create-menu-trigger': true }
    : { 'data-inline-edit-menu-trigger': true };
  const boundaryAttrs = menuScope === 'create'
    ? { 'data-create-menu-boundary': true }
    : { 'data-inline-edit-menu-boundary': true };

  return (
    <div className="tag-select recurrence-select">
      <button
        type="button"
        className={`select tag-select__btn recurrence-select__btn${value ? ' tag-select__btn--active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
        {...triggerAttrs}
      >
        <span className="recurrence-select__label">Repeat</span>
        <span className={`recurrence-select__value${value ? ' recurrence-select__value--active' : ''}`}>{formatRepeatFrequency(value)}</span>
      </button>
      {open && (
        <div className="tag-select__dropdown recurrence-select__dropdown" role="menu" {...boundaryAttrs}>
          {REPEAT_OPTIONS.map(option => (
            <button
              key={option.value || 'none'}
              type="button"
              role="menuitem"
              className={`tag-select__item${value === option.value ? ' tag-select__item--on' : ''}`}
              onClick={() => {
                onChange(option.value);
                onClose();
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
