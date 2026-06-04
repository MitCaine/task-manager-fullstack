import type { MouseEvent } from 'react';

type TagColorPickerProps = {
  colors: string[];
  selectedColor?: string | null;
  onSelectColor: (color: string, event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  getAriaLabel: (color: string) => string;
};

function TagColorPicker({
  colors,
  selectedColor,
  onSelectColor,
  className = 'color-palette',
  getAriaLabel,
}: TagColorPickerProps) {
  return (
    <div className={className}>
      {colors.map(c => (
        <button
          key={c}
          type="button"
          className={`color-swatch${selectedColor === c ? ' color-swatch--selected' : ''}`}
          style={{ background: c }}
          onClick={event => onSelectColor(c, event)}
          title={c}
          aria-label={getAriaLabel(c)}
        />
      ))}
    </div>
  );
}

export default TagColorPicker;
