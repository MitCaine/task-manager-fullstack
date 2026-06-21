import { CSSProperties, HTMLAttributes, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Rect = Pick<DOMRect, 'top' | 'right' | 'bottom' | 'left' | 'width'>;

export type AnchoredDropdownOption<T extends number | string> = {
  value: T;
  label: string;
};

export type AnchoredDropdownPlacement = 'down' | 'up';

export type AnchoredDropdownPositionInput = {
  triggerRect: Rect;
  boundaryRect: Rect;
  viewportRect: Rect;
  menuHeight: number;
  minWidth?: number;
  maxMenuHeight?: number;
  edgePadding?: number;
  gap?: number;
};

export type AnchoredDropdownPosition = {
  placement: AnchoredDropdownPlacement;
  style: CSSProperties;
};

export function calculateAnchoredDropdownPosition({
  triggerRect,
  boundaryRect,
  viewportRect,
  menuHeight,
  minWidth = 0,
  maxMenuHeight = 140,
  edgePadding = 8,
  gap = 3,
}: AnchoredDropdownPositionInput): AnchoredDropdownPosition {
  const activeBoundary = {
    top: Math.max(boundaryRect.top, viewportRect.top),
    right: Math.min(boundaryRect.right, viewportRect.right),
    bottom: Math.min(boundaryRect.bottom, viewportRect.bottom),
    left: Math.max(boundaryRect.left, viewportRect.left),
  };
  const menuWidth = Math.max(triggerRect.width, minWidth);
  const left = Math.min(
    Math.max(activeBoundary.left + edgePadding, triggerRect.left),
    Math.max(activeBoundary.left + edgePadding, activeBoundary.right - menuWidth - edgePadding),
  );
  const desiredHeight = Math.min(menuHeight, maxMenuHeight);
  const availableBelow = Math.max(0, activeBoundary.bottom - triggerRect.bottom - gap);
  const availableAbove = Math.max(0, triggerRect.top - activeBoundary.top - gap);
  const placement: AnchoredDropdownPlacement = desiredHeight > availableBelow && availableAbove > availableBelow ? 'up' : 'down';
  const availableForPlacement = placement === 'up' ? availableAbove : availableBelow;
  const maxHeight = Math.max(32, Math.min(desiredHeight, availableForPlacement || desiredHeight));

  return {
    placement,
    style: {
      position: 'fixed',
      top: placement === 'up' ? triggerRect.top - gap - maxHeight : triggerRect.bottom + gap,
      left,
      width: menuWidth,
      maxHeight,
    },
  };
}

type AnchoredDropdownProps<T extends number | string> = {
  id: string;
  label: string;
  value: T;
  options: Array<AnchoredDropdownOption<T>>;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (value: T) => void;
  boundarySelectors?: string[];
  minMenuWidth?: number;
  maxMenuHeight?: number;
  portalAttrs?: HTMLAttributes<HTMLDivElement>;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  selectedOptionClassName?: string;
  checkClassName?: string;
  renderCheck?: (selected: boolean) => ReactNode;
};

function getViewportRect(): Rect {
  return { top: 0, right: window.innerWidth, bottom: window.innerHeight, left: 0, width: window.innerWidth };
}

function getBoundaryRect(trigger: HTMLElement, selectors: string[]): Rect {
  for (const selector of selectors) {
    const boundary = trigger.closest(selector);
    if (boundary instanceof HTMLElement) return boundary.getBoundingClientRect();
  }
  return getViewportRect();
}

export default function AnchoredDropdown<T extends number | string>({
  id,
  label,
  value,
  options,
  open,
  onToggle,
  onClose,
  onSelect,
  boundarySelectors = [],
  minMenuWidth,
  maxMenuHeight = 140,
  portalAttrs,
  className,
  triggerClassName = 'select',
  menuClassName,
  optionClassName,
  selectedOptionClassName,
  checkClassName,
  renderCheck,
}: AnchoredDropdownProps<T>): JSX.Element {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
  const selectedOption = options[selectedIndex] ?? options[0];
  const menuId = `${id}-menu`;
  const boundarySelectorKey = boundarySelectors.join('\n');

  const selectValue = (nextValue: T) => {
    onSelect(nextValue);
    onClose();
  };

  const moveSelection = (direction: 1 | -1) => {
    const nextIndex = (selectedIndex + direction + options.length) % options.length;
    selectValue(options[nextIndex].value);
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }

    const selectors = boundarySelectorKey ? boundarySelectorKey.split('\n') : [];
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const fallbackHeight = Math.min(maxMenuHeight, (options.length * 29.6) + 8);
      const measuredHeight = menuRef.current?.scrollHeight;
      const { style } = calculateAnchoredDropdownPosition({
        triggerRect: trigger.getBoundingClientRect(),
        boundaryRect: getBoundaryRect(trigger, selectors),
        viewportRect: getViewportRect(),
        menuHeight: measuredHeight ?? fallbackHeight,
        minWidth: minMenuWidth,
        maxMenuHeight,
      });
      setMenuStyle(style);
    };

    updatePosition();
    requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [boundarySelectorKey, maxMenuHeight, minMenuWidth, open, options.length]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (open) moveSelection(1);
      else onToggle();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (open) moveSelection(-1);
      else onToggle();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      onClose();
    }
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, option: AnchoredDropdownOption<T>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectValue(option.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelection(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(-1);
    }
  };

  const menu = open && menuStyle ? createPortal(
    <div
      ref={menuRef}
      className={menuClassName}
      id={menuId}
      role="listbox"
      aria-labelledby={id}
      style={menuStyle}
      {...portalAttrs}
    >
      {options.map(option => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="option"
            aria-selected={selected}
            className={`${optionClassName ?? ''}${selected && selectedOptionClassName ? ` ${selectedOptionClassName}` : ''}`.trim()}
            onClick={() => selectValue(option.value)}
            onKeyDown={event => handleOptionKeyDown(event, option)}
          >
            {renderCheck && <span className={checkClassName} aria-hidden="true">{renderCheck(selected)}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>,
    document.body,
  ) : null;

  return (
    <div className={className}>
      <span>{label}</span>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={triggerClassName}
        aria-label={`${label} ${selectedOption.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={onToggle}
        onKeyDown={handleTriggerKeyDown}
      >
        {selectedOption.label}
      </button>
      {menu}
    </div>
  );
}
