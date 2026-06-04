import type { KeyboardEvent, RefObject } from 'react';
import TagColorPicker from './TagColorPicker';

type InlineTagFormProps = {
  inputRef: RefObject<HTMLInputElement>;
  value: string;
  selectedColor: string;
  colors: string[];
  maxLength: number;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onSelectColor: (color: string) => void;
  getColorAriaLabel: (color: string) => string;
  autoFocus?: boolean;
};

function InlineTagForm({
  inputRef,
  value,
  selectedColor,
  colors,
  maxLength,
  placeholder,
  onChange,
  onSubmit,
  onCancel,
  onSelectColor,
  getColorAriaLabel,
  autoFocus = true,
}: InlineTagFormProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSubmit();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="project-inline-form project-inline-form--tag">
      <div className="tag-inline-top">
        <input
          ref={inputRef}
          className="input project-inline-form__input"
          placeholder={placeholder}
          aria-label="Tag name"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          autoFocus={autoFocus}
        />
        <button className="btn btn--sm" onClick={onSubmit} disabled={!value.trim()}>Create</button>
        <button type="button" className="inline-form__close" onClick={onCancel} title="Close" aria-label="Close tag form">×</button>
      </div>
      <TagColorPicker
        colors={colors}
        selectedColor={selectedColor}
        onSelectColor={onSelectColor}
        getAriaLabel={getColorAriaLabel}
      />
    </div>
  );
}

export default InlineTagForm;
