import type { ChangeEvent } from 'react';
import type { RepeatFrequency } from './RecurrenceControl';

type DetailRepeatRowProps = {
  value: RepeatFrequency;
  onChange: (value: RepeatFrequency) => void;
};

function DetailRepeatRow({ value, onChange }: DetailRepeatRowProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as RepeatFrequency);
  };

  return (
    <div className="detail__repeat-row">
      <span className="detail__field-label">Repeat</span>
      <select
        className="select select--sm"
        value={value}
        onChange={handleChange}
      >
        <option value="">None</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
    </div>
  );
}

export default DetailRepeatRow;
