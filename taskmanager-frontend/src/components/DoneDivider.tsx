type DoneDividerProps = {
  doneCount: number;
};

function DoneDivider({ doneCount }: DoneDividerProps) {
  return (
    <li className="done-divider" aria-hidden="true">
      <span className="done-divider__label">{doneCount} done</span>
    </li>
  );
}

export default DoneDivider;
