import type { KeyboardEvent, RefObject } from 'react';

type InlineProjectFormProps = {
  inputRef: RefObject<HTMLInputElement>;
  value: string;
  maxLength: number;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  autoFocus?: boolean;
};

function InlineProjectForm({
  inputRef,
  value,
  maxLength,
  placeholder,
  onChange,
  onSubmit,
  onCancel,
  autoFocus = true,
}: InlineProjectFormProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSubmit();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="project-inline-form">
      <input
        ref={inputRef}
        className="input project-inline-form__input"
        placeholder={placeholder}
        aria-label="Project name"
        value={value}
        maxLength={maxLength}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
      />
      <button className="btn btn--sm" onClick={onSubmit} disabled={!value.trim()}>Create</button>
      <button type="button" className="inline-form__close" onClick={onCancel} title="Close" aria-label="Close project form">×</button>
    </div>
  );
}

export default InlineProjectForm;
