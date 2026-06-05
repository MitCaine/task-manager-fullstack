type DetailTimeShiftRowProps = {
  onShiftHour: () => void;
  onShiftDay: () => void;
};

function DetailTimeShiftRow({ onShiftHour, onShiftDay }: DetailTimeShiftRowProps) {
  return (
    <div className="time-shift-row">
      <button type="button" className="btn btn--ghost btn--sm" onClick={onShiftHour}>+1 hr</button>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onShiftDay}>+1 day</button>
    </div>
  );
}

export default DetailTimeShiftRow;
