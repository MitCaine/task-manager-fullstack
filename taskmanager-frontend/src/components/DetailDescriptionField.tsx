import type { ChangeEvent } from 'react';

const DESCRIPTION_MAX_LENGTH = 1000;

type DetailDescriptionFieldProps = {
  value: string;
  onValue: (value: string) => void;
};

function DetailDescriptionField({ value, onValue }: DetailDescriptionFieldProps) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onValue(event.currentTarget.value);
  };

  return (
    <div className="desc-wrap">
      <textarea
        className="input controls__description"
        value={value}
        onChange={handleChange}
        placeholder="Description"
        aria-label="Task description"
        maxLength={DESCRIPTION_MAX_LENGTH}
        rows={3}
      />
      <span className="char-count">{value.length}/{DESCRIPTION_MAX_LENGTH}</span>
    </div>
  );
}

export default DetailDescriptionField;
