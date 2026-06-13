import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Ampm } from '../../utils/taskForm';
import TimeSelect from './TimeSelect';

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

export type CloseFloatingControls = (options?: { timeEditors?: boolean; createControls?: boolean }) => void;

export type DateTimeRowProps = {
  editorScope: string;
  openTimeEditorScope: string | null;
  setOpenTimeEditorScope: Dispatch<SetStateAction<string | null>>;
  closeFloatingControls: CloseFloatingControls;
  is24Hour: boolean;
  hourOptions: string[];
  openControl?: string | null;
  setOpenControl?: Dispatch<SetStateAction<string | null>>;
  controlIds?: {
    date: string;
    start: string;
    end: string;
    startHour: string;
    startMinute: string;
    startAmpm: string;
    endHour: string;
    endMinute: string;
    endAmpm: string;
  };
  dateVal: string;
  hourVal: string;
  minuteVal: string;
  ampmVal: Ampm;
  onDate: (v: string) => void;
  onHour: (v: string) => void;
  onMinute: (v: string) => void;
  onAmpm: (v: Ampm) => void;
  showTime?: boolean;
  onToggleTime?: () => void;
  onRemoveStart?: () => void;
  showEndTime?: boolean;
  onToggleEndTime?: () => void;
  endHourVal?: string;
  endMinuteVal?: string;
  endAmpmVal?: Ampm;
  onEndHour?: (v: string) => void;
  onEndMinute?: (v: string) => void;
  onEndAmpm?: (v: Ampm) => void;
  useDateDisplayProxy?: boolean;
  dateDisplayLabel?: string;
  desktopSingleRow?: boolean;
};

// Shared date and optional start/end time controls.
export default function DateTimeRow({
  editorScope,
  openTimeEditorScope,
  setOpenTimeEditorScope,
  closeFloatingControls,
  is24Hour,
  hourOptions,
  openControl,
  setOpenControl,
  controlIds,
  dateVal, hourVal, minuteVal, ampmVal,
  onDate, onHour, onMinute, onAmpm,
  showTime, onToggleTime, onRemoveStart,
  showEndTime, onToggleEndTime,
  endHourVal, endMinuteVal, endAmpmVal,
  onEndHour, onEndMinute, onEndAmpm,
  useDateDisplayProxy = false,
  dateDisplayLabel,
  desktopSingleRow = false,
}: DateTimeRowProps): JSX.Element {
  const [openTimeSelect, setOpenTimeSelect] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const dateControl = controlIds?.date ?? `${editorScope}:date`;
  const startControl = controlIds?.start ?? `${editorScope}:start`;
  const endControl = controlIds?.end ?? `${editorScope}:end`;
  const startHourControl = controlIds?.startHour ?? 'start-hour';
  const startMinuteControl = controlIds?.startMinute ?? 'start-minute';
  const startAmpmControl = controlIds?.startAmpm ?? 'start-ampm';
  const endHourControl = controlIds?.endHour ?? 'end-hour';
  const endMinuteControl = controlIds?.endMinute ?? 'end-minute';
  const endAmpmControl = controlIds?.endAmpm ?? 'end-ampm';
  const ownedControls = [
    dateControl,
    startControl,
    endControl,
    startHourControl,
    startMinuteControl,
    startAmpmControl,
    endHourControl,
    endMinuteControl,
    endAmpmControl,
  ];
  const controlledCreateRow = Boolean(controlIds && setOpenControl);
  const activeEditor: 'start' | 'end' | null =
    controlledCreateRow
      ? (openControl === startControl || openControl === startHourControl || openControl === startMinuteControl || openControl === startAmpmControl ? 'start' :
        openControl === endControl || openControl === endHourControl || openControl === endMinuteControl || openControl === endAmpmControl ? 'end' :
        null)
      : (openTimeEditorScope === `${editorScope}:start` ? 'start' :
        openTimeEditorScope === `${editorScope}:end` ? 'end' :
        null);

  const timeSummary = (h: string, m: string, a?: Ampm) =>
    is24Hour ? `${h}:${m}` : `${h}:${m} ${a ?? 'AM'}`;

  const setScopedTimeSelect = (next: string | null) => {
    setOpenTimeSelect(next);
  };
  const canRenderActiveEditor =
    activeEditor === 'start' ||
    (activeEditor === 'end' && Boolean(showEndTime && onEndHour && onEndMinute && onEndAmpm));
  const dateLabel = dateDisplayLabel ?? dateVal;

  const openDateControl = () => {
    closeFloatingControls({ createControls: false });
    setOpenTimeEditorScope(current => current?.startsWith(`${editorScope}:`) ? null : current);
    setOpenControl?.(dateControl);
  };

  const handleDateChange = (nextDate: string) => {
    onDate(nextDate);
    if (controlledCreateRow) setOpenControl?.(dateControl);
  };

  const renderTimeControl = ({
    control,
    hasValue,
    mainLabel,
    legacyEmptyLabel,
    onMainClick,
  }: {
    control: 'start' | 'end';
    hasValue: boolean;
    mainLabel: JSX.Element | string;
    legacyEmptyLabel?: string;
    onMainClick: () => void;
  }) => (
    <button
      type="button"
      className={`btn btn--ghost btn--sm datetime-row__time-control datetime-row__time-control--${control}${hasValue ? ' datetime-row__time-control--has-value datetime-row__time-summary' : ' datetime-row__time-control--empty datetime-row__time-toggle'}${activeEditor === control ? ' datetime-row__time-control--active datetime-row__time-summary--active' : ''}`}
      onClick={onMainClick}
      aria-label={!hasValue ? legacyEmptyLabel : undefined}
      data-create-menu-trigger
    >
      <span className="datetime-row__time-text">
        {hasValue ? mainLabel : `+ ${mainLabel}`}
      </span>
    </button>
  );

  const closeTimeEditor = () => {
    setOpenTimeSelect(null);
    setOpenTimeEditorScope(current => current?.startsWith(`${editorScope}:`) ? null : current);
    setOpenControl?.(current => current && ownedControls.includes(current) ? null : current);
  };

  const openStartEditor = () => {
    if (controlledCreateRow && activeEditor === 'start') {
      closeTimeEditor();
      return;
    }
    if (!controlledCreateRow && activeEditor === 'start') {
      closeTimeEditor();
      return;
    }
    closeFloatingControls({ timeEditors: false, createControls: false });
    setOpenControl?.(startControl);
    setOpenTimeEditorScope(`${editorScope}:start`);
    if (showTime === false) onToggleTime?.();
    setOpenTimeSelect(null);
  };

  const openEndEditor = () => {
    if (controlledCreateRow && activeEditor === 'end') {
      closeTimeEditor();
      return;
    }
    if (!controlledCreateRow && activeEditor === 'end') {
      closeTimeEditor();
      return;
    }
    closeFloatingControls({ timeEditors: false, createControls: false });
    setOpenControl?.(endControl);
    setOpenTimeEditorScope(`${editorScope}:end`);
    if (!showEndTime) onToggleEndTime?.();
    setOpenTimeSelect(null);
  };

  useEffect(() => {
    if (!activeEditor || controlledCreateRow) return;
    const scopedOpen = !openControl || ownedControls.includes(openControl);
    if (!openTimeEditorScope?.startsWith(`${editorScope}:`) || !scopedOpen) closeTimeEditor();
  }, [activeEditor, openControl, openTimeEditorScope, editorScope, controlledCreateRow]);

  useEffect(() => {
    if (!activeEditor || controlledCreateRow) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.time-select__dropdown')) return;
      if (!rowRef.current?.contains(target)) closeTimeEditor();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeTimeEditor();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeEditor, controlledCreateRow]);

  return (
    <div className={`datetime-row${desktopSingleRow ? ' datetime-row--desktop-single-row' : ''}`} ref={rowRef}>
      <div className="datetime-row__top">
        {useDateDisplayProxy ? (
          <div className="datetime-row__date-shell">
            <input
              className={`input datetime-row__date datetime-row__date--proxy${openControl === dateControl ? ' datetime-row__date--active' : ''}`}
              type="date"
              value={dateVal}
              aria-label={`Task date ${dateLabel}`}
              onClick={openDateControl}
              data-create-menu-trigger
              data-open={openControl === dateControl ? 'true' : undefined}
              onInput={e => handleDateChange((e.target as HTMLInputElement).value)}
              onChange={e => handleDateChange(e.target.value)}
            />
            <span className={`btn btn--ghost btn--sm datetime-row__date-display${openControl === dateControl ? ' datetime-row__date-display--active' : ''}`} aria-hidden="true">
              {dateLabel}
            </span>
          </div>
        ) : (
          <input
            className={`input datetime-row__date${openControl === dateControl ? ' datetime-row__date--active' : ''}`}
            type="date"
            value={dateVal}
            aria-label={`Task date ${dateLabel}`}
            onClick={openDateControl}
            data-create-menu-trigger
            data-open={openControl === dateControl ? 'true' : undefined}
            onInput={e => handleDateChange((e.target as HTMLInputElement).value)}
            onChange={e => handleDateChange(e.target.value)}
          />
        )}
      </div>
      <div className="datetime-row__summary-row">
        {renderTimeControl({
          control: 'start',
          hasValue: showTime !== false,
          mainLabel: showTime === false
            ? 'Start time'
            : (
              <>
                <span className={`datetime-row__summary-label${activeEditor === 'start' ? ' datetime-row__summary-label--active' : ''}`}>Start:</span>
                {' '}
                {timeSummary(hourVal, minuteVal, ampmVal)}
              </>
            ),
          legacyEmptyLabel: '+ Start time',
          onMainClick: openStartEditor,
        })}
        {onToggleEndTime ? (
          renderTimeControl({
            control: 'end',
            hasValue: Boolean(showEndTime && onEndHour && onEndMinute && onEndAmpm),
            mainLabel: showEndTime && onEndHour && onEndMinute && onEndAmpm
              ? (
                <>
                  <span className={`datetime-row__summary-label${activeEditor === 'end' ? ' datetime-row__summary-label--active' : ''}`}>End:</span>
                  {' '}
                  {timeSummary(endHourVal ?? '12', endMinuteVal ?? '00', endAmpmVal)}
                </>
              )
              : 'End time',
            legacyEmptyLabel: '+ End time',
            onMainClick: openEndEditor,
          })
        ) : null}
      </div>
      {canRenderActiveEditor && (
        <div className="datetime-row__editor" data-create-menu-boundary>
          {activeEditor === 'start' ? (
            <div className="datetime-row__time datetime-row__time--end">
              <span className="datetime-row__end-label datetime-row__end-label--fixed">Start:</span>
              <TimeSelect
                id={startHourControl}
                value={hourVal}
                options={hourOptions}
                onChange={onHour}
                openId={openTimeSelect}
                setOpenId={setScopedTimeSelect}
                sharedOpenId={openControl}
                setSharedOpenId={setOpenControl}
                fallbackOpenId={startControl}
              />
              <span className="time-sep">:</span>
              <TimeSelect
                id={startMinuteControl}
                value={minuteVal}
                options={MINUTE_OPTIONS}
                onChange={onMinute}
                openId={openTimeSelect}
                setOpenId={setScopedTimeSelect}
                sharedOpenId={openControl}
                setSharedOpenId={setOpenControl}
                fallbackOpenId={startControl}
              />
              {!is24Hour && (
                <TimeSelect
                  id={startAmpmControl}
                  value={ampmVal}
                  options={['AM', 'PM']}
                  onChange={v => onAmpm(v as Ampm)}
                  openId={openTimeSelect}
                  setOpenId={setScopedTimeSelect}
                  sharedOpenId={openControl}
                  setSharedOpenId={setOpenControl}
                  fallbackOpenId={startControl}
                />
              )}
              <div className="datetime-row__editor-actions">
                {showTime !== false && onRemoveStart && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm datetime-row__clear-time"
                    onClick={() => { onRemoveStart(); closeTimeEditor(); }}
                  >
                    Clear Time
                  </button>
                )}
                <button type="button" className="btn btn--ghost btn--sm datetime-row__done" onClick={closeTimeEditor}>
                  Done
                </button>
              </div>
            </div>
          ) : showEndTime && onEndHour && onEndMinute && onEndAmpm ? (
            <div className="datetime-row__time datetime-row__time--end">
              <span className="datetime-row__end-label datetime-row__end-label--fixed">End:</span>
              <TimeSelect
                id={endHourControl}
                value={endHourVal ?? '12'}
                options={hourOptions}
                onChange={onEndHour}
                openId={openTimeSelect}
                setOpenId={setScopedTimeSelect}
                sharedOpenId={openControl}
                setSharedOpenId={setOpenControl}
                fallbackOpenId={endControl}
              />
              <span className="time-sep">:</span>
              <TimeSelect
                id={endMinuteControl}
                value={endMinuteVal ?? '00'}
                options={MINUTE_OPTIONS}
                onChange={onEndMinute}
                openId={openTimeSelect}
                setOpenId={setScopedTimeSelect}
                sharedOpenId={openControl}
                setSharedOpenId={setOpenControl}
                fallbackOpenId={endControl}
              />
              {!is24Hour && (
                <TimeSelect
                  id={endAmpmControl}
                  value={endAmpmVal ?? 'AM'}
                  options={['AM', 'PM']}
                  onChange={v => onEndAmpm(v as Ampm)}
                  openId={openTimeSelect}
                  setOpenId={setScopedTimeSelect}
                  sharedOpenId={openControl}
                  setSharedOpenId={setOpenControl}
                  fallbackOpenId={endControl}
                />
              )}
              <div className="datetime-row__editor-actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm datetime-row__clear-time"
                  onClick={() => { onToggleEndTime?.(); closeTimeEditor(); }}
                >
                  Clear Time
                </button>
                <button type="button" className="btn btn--ghost btn--sm datetime-row__done" onClick={closeTimeEditor}>
                  Done
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
