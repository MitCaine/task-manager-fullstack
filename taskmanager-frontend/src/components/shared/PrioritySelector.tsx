import type { ButtonHTMLAttributes, HTMLAttributes, RefObject } from 'react';
import { formatPriorityLabel } from '../../utils/taskDisplayHelpers';

export type PriorityValue = 'LOW' | 'MEDIUM' | 'HIGH';

type DataAttributes = Record<`data-${string}`, string | boolean | number | undefined>;

type PrioritySelectorProps = {
  value: PriorityValue | '';
  colors: Record<string, string>;
  open: boolean;
  onToggle: () => void;
  onSelect: (value: PriorityValue | '') => void;
  triggerLabel: string;
  removeLabel: string;
  rootRef?: RefObject<HTMLDivElement>;
  triggerAttributes?: ButtonHTMLAttributes<HTMLButtonElement> & DataAttributes;
  dropdownAttributes?: HTMLAttributes<HTMLDivElement> & DataAttributes;
  removeOptionBaseClassName?: string;
};

const PRIORITIES: PriorityValue[] = ['LOW', 'MEDIUM', 'HIGH'];

export default function PrioritySelector({
  value,
  colors,
  open,
  onToggle,
  onSelect,
  triggerLabel,
  removeLabel,
  rootRef,
  triggerAttributes,
  dropdownAttributes,
  removeOptionBaseClassName = 'tag-select__item tag-select__item--remove',
}: PrioritySelectorProps): JSX.Element {
  return (
    <div className="tag-select" ref={rootRef}>
      <button
        type="button"
        className={`select tag-select__btn${value !== '' ? ' tag-select__btn--active' : ''}`}
        onClick={onToggle}
        {...triggerAttributes}
      >
        {value === ''
          ? triggerLabel
          : <><span className="priority-dot" style={{ background: colors[value] }} />{formatPriorityLabel(value)}</>}
      </button>
      {open && (
        <div className="tag-select__dropdown" {...dropdownAttributes}>
          <button
            type="button"
            className={`${removeOptionBaseClassName}${value === '' ? ' tag-select__item--on' : ''}`}
            onClick={() => onSelect('')}
          >
            {removeLabel}
          </button>
          {PRIORITIES.map(priority => (
            <button
              key={priority}
              type="button"
              className={`tag-select__item${value === priority ? ' tag-select__item--on' : ''}`}
              onClick={() => onSelect(priority)}
            >
              <span className="priority-dot" style={{ background: colors[priority] }} />
              {formatPriorityLabel(priority)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
