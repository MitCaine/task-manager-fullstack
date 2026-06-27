import { useEffect, useState } from 'react';
import AnchoredDropdown from '../shared/AnchoredDropdown';
import type { AnchoredDropdownOption } from '../shared/AnchoredDropdown';
import {
  clampRecurrenceInterval,
  formatRecurrenceInterval,
  RECURRENCE_UNIT_LIMITS,
  RECURRENCE_UNITS,
} from '../../utils/taskRecurrence';
import type { RecurrenceUnit, RepeatValue } from '../../utils/taskRecurrence';

const UNIT_LABELS: Record<RecurrenceUnit, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  year: 'Year',
};

function getValueOptions(unit: RecurrenceUnit): number[] {
  return Array.from({ length: RECURRENCE_UNIT_LIMITS[unit] }, (_, index) => index + 1);
}

type RecurrenceIntervalMenu = 'value' | 'unit' | null;

type RecurrenceIntervalDropdownProps<T extends number | string> = {
  id: string;
  label: string;
  value: T;
  options: Array<AnchoredDropdownOption<T>>;
  open: boolean;
  boundaryAttrs: Record<string, boolean | undefined>;
  onToggle: () => void;
  onClose: () => void;
  onChange: (value: T) => void;
};

function RecurrenceIntervalDropdown<T extends number | string>({
  id,
  label,
  value,
  options,
  open,
  boundaryAttrs,
  onToggle,
  onClose,
  onChange,
}: RecurrenceIntervalDropdownProps<T>): JSX.Element {
  return (
    <AnchoredDropdown
      id={id}
      label={label}
      value={value}
      options={options}
      open={open}
      onToggle={onToggle}
      onClose={onClose}
      onSelect={onChange}
      boundarySelectors={['.app__list', '.app__add', '.card']}
      minMenuWidth={88}
      maxMenuHeight={140}
      portalAttrs={boundaryAttrs}
      className="recurrence-select__field"
      triggerClassName="select select--sm recurrence-select__mini-trigger"
      menuClassName="recurrence-select__mini-menu recurrence-select__mini-menu--portal"
      optionClassName="recurrence-select__mini-option"
      selectedOptionClassName="recurrence-select__mini-option--selected"
      checkClassName="recurrence-select__mini-check"
      renderCheck={selected => selected ? '✓' : ''}
    />
  );
}

export type RecurrenceControlProps = {
  value: RepeatValue;
  onChange: (value: RepeatValue) => void;
  openControl: string | null;
  onToggle: () => void;
  onClose: () => void;
  controlId: string;
  menuScope: string;
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
  const [openIntervalMenu, setOpenIntervalMenu] = useState<RecurrenceIntervalMenu>(null);
  const selected = value ?? { intervalUnit: 'day' as RecurrenceUnit, intervalValue: 1 };
  const selectedValues = getValueOptions(selected.intervalUnit);
  const valueOptions = selectedValues.map(option => ({ value: option, label: String(option) }));
  const unitOptions = RECURRENCE_UNITS.map(unit => ({ value: unit, label: UNIT_LABELS[unit] }));
  const triggerAttrs = menuScope === 'create'
    ? { 'data-create-menu-trigger': true }
    : { 'data-inline-edit-menu-trigger': true };
  const boundaryAttrs = menuScope === 'create'
    ? { 'data-create-menu-boundary': true }
    : { 'data-inline-edit-menu-boundary': true };

  useEffect(() => {
    if (!open) setOpenIntervalMenu(null);
  }, [open]);

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
        <span className={`recurrence-select__value${value ? ' recurrence-select__value--active' : ''}`}>{value ? formatRecurrenceInterval(value) : 'Never repeat'}</span>
      </button>
      {open && (
        <div className="tag-select__dropdown recurrence-select__dropdown recurrence-select__dropdown--value-aligned" role="menu" {...boundaryAttrs}>
          <div className="recurrence-select__interval-controls" onClick={event => event.stopPropagation()}>
            <RecurrenceIntervalDropdown
              id={`${menuScope}-${controlId}-value`}
              label="Every"
              value={selected.intervalValue}
              options={valueOptions}
              open={openIntervalMenu === 'value'}
              boundaryAttrs={boundaryAttrs}
              onToggle={() => setOpenIntervalMenu(current => current === 'value' ? null : 'value')}
              onClose={() => setOpenIntervalMenu(null)}
              onChange={intervalValue => onChange({ ...selected, intervalValue })}
            />
            <RecurrenceIntervalDropdown
              id={`${menuScope}-${controlId}-unit`}
              label="Unit"
              value={selected.intervalUnit}
              options={unitOptions}
              open={openIntervalMenu === 'unit'}
              boundaryAttrs={boundaryAttrs}
              onToggle={() => setOpenIntervalMenu(current => current === 'unit' ? null : 'unit')}
              onClose={() => setOpenIntervalMenu(null)}
              onChange={intervalUnit => onChange(clampRecurrenceInterval({ intervalUnit, intervalValue: selected.intervalValue }))}
            />
          </div>
          <div className="recurrence-select__actions">
            <button
                type="button"
                role="menuitem"
                className="btn btn--ghost btn--sm recurrence-select__clear"
                onClick={() => {
                  onChange(null);
                  onClose();
                }}
            >
              Never repeat
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm recurrence-select__done"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
