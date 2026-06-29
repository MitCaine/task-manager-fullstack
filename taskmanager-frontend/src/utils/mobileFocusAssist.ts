export const shouldUseMobileFocusAssist = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && Boolean(window.matchMedia('(max-width: 720px), (pointer: coarse)')?.matches)
);

export const focusInputWithProxyAssist = (input: HTMLInputElement) => {
  // WKWebView can visually pull a low mobile card/page when the real input is
  // focused directly. Focus a fixed proxy first, then the real input with
  // preventScroll; scroll-reset timers or touch-action/overscroll CSS alone did
  // not fix this class of iOS focus pull.
  const rect = input.getBoundingClientRect();
  const safeWidth = rect.width > 0 ? `${rect.width}px` : 'calc(100vw - 96px)';
  const safeHeight = rect.height > 0 ? `${rect.height}px` : '2rem';
  const proxy = document.createElement('input');
  proxy.type = 'text';
  proxy.setAttribute('aria-hidden', 'true');
  proxy.tabIndex = -1;
  proxy.style.setProperty('position', 'fixed', 'important');
  proxy.style.setProperty('top', '204px', 'important');
  proxy.style.setProperty('left', '48px', 'important');
  proxy.style.setProperty('width', safeWidth, 'important');
  proxy.style.setProperty('height', safeHeight, 'important');
  proxy.style.setProperty('opacity', '0.01', 'important');
  proxy.style.setProperty('z-index', '99999', 'important');
  proxy.style.setProperty('pointer-events', 'none', 'important');
  document.body.appendChild(proxy);

  try {
    proxy.focus({ preventScroll: true });
  } catch {
    proxy.focus();
  }

  window.setTimeout(() => {
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
    proxy.remove();
  }, 250);
};

export const handleProxyFocusAssistTouchStart = (event: {
  currentTarget: HTMLInputElement;
  target: EventTarget;
  preventDefault: () => void;
  stopPropagation: () => void;
}) => {
  if (!shouldUseMobileFocusAssist()) return;
  if (event.currentTarget !== event.target) return;
  // Block native touch focus so WKWebView sees the safe proxy geometry before
  // the real input receives focus in its original layout.
  event.preventDefault();
  event.stopPropagation();
  focusInputWithProxyAssist(event.currentTarget);
};
