import { calculateAnchoredDropdownPosition } from './AnchoredDropdown';

const viewportRect = { top: 0, right: 400, bottom: 400, left: 0, width: 400 };
const boundaryRect = { top: 0, right: 300, bottom: 300, left: 0, width: 300 };

describe('calculateAnchoredDropdownPosition', () => {
  it('opens down when the menu fits below', () => {
    const result = calculateAnchoredDropdownPosition({
      triggerRect: { top: 100, right: 140, bottom: 130, left: 80, width: 60 },
      boundaryRect,
      viewportRect,
      menuHeight: 120,
      minWidth: 88,
    });

    expect(result.placement).toBe('down');
    expect(result.style.top).toBe(133);
    expect(result.style.width).toBe(88);
    expect(result.style.maxHeight).toBe(120);
  });

  it('opens up when down would overflow and above has more room', () => {
    const result = calculateAnchoredDropdownPosition({
      triggerRect: { top: 240, right: 140, bottom: 270, left: 80, width: 60 },
      boundaryRect,
      viewportRect,
      menuHeight: 120,
      minWidth: 88,
    });

    expect(result.placement).toBe('up');
    expect(result.style.top).toBe(117);
    expect(result.style.maxHeight).toBe(120);
  });

  it('uses max-height when neither side fully fits', () => {
    const result = calculateAnchoredDropdownPosition({
      triggerRect: { top: 80, right: 140, bottom: 110, left: 80, width: 60 },
      boundaryRect: { top: 0, right: 300, bottom: 160, left: 0, width: 300 },
      viewportRect,
      menuHeight: 140,
      minWidth: 88,
    });

    expect(result.placement).toBe('up');
    expect(result.style.maxHeight).toBe(77);
    expect(result.style.top).toBe(0);
  });

  it('calculates each instance independently', () => {
    const first = calculateAnchoredDropdownPosition({
      triggerRect: { top: 240, right: 140, bottom: 270, left: 80, width: 60 },
      boundaryRect,
      viewportRect,
      menuHeight: 120,
    });
    const second = calculateAnchoredDropdownPosition({
      triggerRect: { top: 80, right: 140, bottom: 110, left: 80, width: 60 },
      boundaryRect,
      viewportRect,
      menuHeight: 80,
    });

    expect(first.placement).toBe('up');
    expect(second.placement).toBe('down');
  });
});
