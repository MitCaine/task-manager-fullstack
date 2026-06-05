import DateTimeRow from './DateTimeRow';
import type { DateTimeRowProps } from './DateTimeRow';

type DetailScheduleFieldsProps = {
  dateTimeRowProps: DateTimeRowProps;
  timeRangeError: string | null;
  onShiftHour: () => void;
  onShiftDay: () => void;
};

type DetailTimeShiftRowProps = {
  onShiftHour: () => void;
  onShiftDay: () => void;
};

function DetailTimeShiftRow({ onShiftHour, onShiftDay }: DetailTimeShiftRowProps) {
  return (
    <div className="detail__quick-actions">
      <span>Quick shift</span>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onShiftHour}>+1 hour</button>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onShiftDay}>Tomorrow</button>
    </div>
  );
}

function DetailScheduleFields({
  dateTimeRowProps,
  timeRangeError,
  onShiftHour,
  onShiftDay,
}: DetailScheduleFieldsProps) {
  return (
    <>
      <DateTimeRow {...dateTimeRowProps} />
      {timeRangeError && <p className="input-error-msg">{timeRangeError}</p>}
      <DetailTimeShiftRow onShiftHour={onShiftHour} onShiftDay={onShiftDay} />
    </>
  );
}

export default DetailScheduleFields;
