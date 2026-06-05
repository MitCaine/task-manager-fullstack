import DateTimeRow from './DateTimeRow';
import type { DateTimeRowProps } from './DateTimeRow';
import DetailTimeShiftRow from './DetailTimeShiftRow';

type DetailScheduleFieldsProps = {
  dateTimeRowProps: DateTimeRowProps;
  timeRangeError: string | null;
  onShiftHour: () => void;
  onShiftDay: () => void;
};

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
