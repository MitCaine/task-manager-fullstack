import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export type TimeSelectProps = {
  id: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  sharedOpenId?: string | null;
  setSharedOpenId?: Dispatch<SetStateAction<string | null>>;
  fallbackOpenId?: string;
};

// Custom time dropdown keeps the selected option visible when opened.
export default function TimeSelect({
  id,
  value,
  options,
  onChange,
  openId,
  setOpenId,
  sharedOpenId,
  setSharedOpenId,
  fallbackOpenId,
}: TimeSelectProps): JSX.Element {
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const controlled = Boolean(setSharedOpenId);
  const open = controlled ? sharedOpenId === id : openId === id;

  const closeSelect = () => {
    setOpenId(null);
    setSharedOpenId?.(fallbackOpenId ?? null);
  };

  const handleOpen = () => {
    setOpenId(open ? null : id);
    setSharedOpenId?.(open ? (fallbackOpenId ?? null) : id);
  };

  useEffect(() => {
    if (!open || controlled) return;
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) closeSelect();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, controlled, closeSelect]);

  useEffect(() => {
    if (!open || !dropRef.current) return;
    const selected = dropRef.current.querySelector('.time-select__item--on');
    if (selected instanceof HTMLElement && typeof selected.scrollIntoView === 'function') {
      selected.scrollIntoView({ block: 'center' });
    }
  }, [open]);

  return (
    <div className="time-select">
      <button type="button" className="select time-select__btn" ref={btnRef} onClick={handleOpen} data-create-menu-trigger>
        {value}
      </button>
      {open && (
        <div className="time-select__dropdown" ref={dropRef} data-create-menu-boundary>
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              className={`time-select__item${opt === value ? ' time-select__item--on' : ''}`}
              onClick={() => { onChange(opt); closeSelect(); }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
