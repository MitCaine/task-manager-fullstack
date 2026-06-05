import type { KeyboardEventHandler, Ref } from 'react';
import DateTimeRow from '../shared/DateTimeRow';
import type { DateTimeRowProps } from '../shared/DateTimeRow';
import RecurrenceControl from './RecurrenceControl';
import type { RecurrenceControlProps } from './RecurrenceControl';

export type TaskEditorFieldsProps = {
  titleValue: string;
  onTitleChange: (value: string) => void;
  titleInputRef?: Ref<HTMLInputElement>;
  titleClassName?: string;
  titleType?: 'text';
  onTitleKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  titleErrorMessage?: string | null;
  titleWarningMessage?: string | null;
  descriptionValue: string;
  onDescriptionChange: (value: string) => void;
  descriptionPlaceholder: string;
  descriptionRows: number;
  descriptionTitleStyleInput?: boolean;
  dateTimeRowProps: DateTimeRowProps;
  recurrenceControlProps: RecurrenceControlProps;
  timeRangeError?: string | null;
};

export default function TaskEditorFields({
  titleValue,
  onTitleChange,
  titleInputRef,
  titleClassName = 'input',
  titleType,
  onTitleKeyDown,
  titleErrorMessage,
  titleWarningMessage,
  descriptionValue,
  onDescriptionChange,
  descriptionPlaceholder,
  descriptionRows,
  descriptionTitleStyleInput = false,
  dateTimeRowProps,
  recurrenceControlProps,
  timeRangeError,
}: TaskEditorFieldsProps): JSX.Element {
  return (
    <>
      <input
        ref={titleInputRef}
        className={titleClassName}
        type={titleType}
        value={titleValue}
        onChange={e => onTitleChange(e.target.value)}
        onKeyDown={onTitleKeyDown}
        placeholder="Task title"
        aria-label="Task title"
      />
      {titleErrorMessage && <p className="input-error-msg">{titleErrorMessage}</p>}
      {titleWarningMessage && <p className="input-warn-msg">{titleWarningMessage}</p>}
      <div className="desc-wrap">
        {descriptionTitleStyleInput ? (
          <input
            className="input"
            type="text"
            value={descriptionValue}
            onChange={e => onDescriptionChange(e.currentTarget.value)}
            placeholder={descriptionPlaceholder}
            aria-label="Task description"
            maxLength={1000}
          />
        ) : (
          <textarea
            className="input controls__description"
            value={descriptionValue}
            onChange={e => onDescriptionChange(e.currentTarget.value)}
            placeholder={descriptionPlaceholder}
            aria-label="Task description"
            maxLength={1000}
            rows={descriptionRows}
          />
        )}
        <span className="char-count">{descriptionValue.length}/1000</span>
      </div>
      <DateTimeRow {...dateTimeRowProps} />
      <RecurrenceControl {...recurrenceControlProps} />
      {timeRangeError && <p className="input-error-msg">{timeRangeError}</p>}
    </>
  );
}
