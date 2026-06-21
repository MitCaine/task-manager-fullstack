import type { ChangeEvent } from 'react';
import {
  clampRecurrenceInterval,
  RECURRENCE_UNIT_LIMITS,
  RECURRENCE_UNITS,
} from '../../utils/taskRecurrence';
import type { RecurrenceUnit, RepeatValue } from '../../utils/taskRecurrence';

type DetailRepeatRowProps = {
  value: RepeatValue;
  onChange: (value: RepeatValue) => void;
};

function DetailRepeatRow({ value, onChange }: DetailRepeatRowProps) {
  const selected = value ?? { intervalUnit: 'day' as RecurrenceUnit, intervalValue: 1 };
  const values = Array.from({ length: RECURRENCE_UNIT_LIMITS[selected.intervalUnit] }, (_, index) => index + 1);

  const handleEnabledChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value === 'none' ? null : selected);
  };

  const handleValueChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...selected, intervalValue: Number(event.target.value) });
  };

  const handleUnitChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const intervalUnit = event.target.value as RecurrenceUnit;
    onChange(clampRecurrenceInterval({ intervalUnit, intervalValue: selected.intervalValue }));
  };

  return (
    <div className="detail__repeat-row">
      <span className="detail__field-label">Repeat</span>
      <select
        className="select select--sm"
        value={value ? 'repeat' : 'none'}
        onChange={handleEnabledChange}
      >
        <option value="none">None</option>
        <option value="repeat">Every</option>
      </select>
      {value && (
        <>
          <select className="select select--sm" value={selected.intervalValue} onChange={handleValueChange}>
            {values.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select className="select select--sm" value={selected.intervalUnit} onChange={handleUnitChange}>
            {RECURRENCE_UNITS.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}

export default DetailRepeatRow;
