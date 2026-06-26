import { useEffect, useRef } from 'react';

type UseModalFocusReturnOptions = {
  showStats: boolean;
  showSettings: boolean;
  statusMoveOpen: boolean;
};

function rememberCurrentFocus(targetRef: { current: HTMLElement | null }) {
  targetRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

function restoreFocusIfAppropriate(targetRef: { current: HTMLElement | null }) {
  const target = targetRef.current;
  targetRef.current = null;
  const active = document.activeElement;
  const shouldRestore = !active || active === document.body || (active instanceof HTMLElement && !active.isConnected);
  if (shouldRestore && target?.isConnected) target.focus();
}

export default function useModalFocusReturn({
  showStats,
  showSettings,
  statusMoveOpen,
}: UseModalFocusReturnOptions) {
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsRestoreFocusRef = useRef<HTMLElement | null>(null);
  const wasSettingsOpenRef = useRef(false);
  const statusFirstActionRef = useRef<HTMLButtonElement>(null);
  const statusRestoreFocusRef = useRef<HTMLElement | null>(null);
  const wasStatusMoveOpenRef = useRef(false);
  const statsTriggerRef = useRef<HTMLButtonElement>(null);
  const statsCloseRef = useRef<HTMLButtonElement>(null);
  const statsRestoreFocusRef = useRef<HTMLElement | null>(null);
  const wasStatsOpenRef = useRef(false);

  useEffect(() => {
    if (showStats) {
      statsCloseRef.current?.focus();
    } else if (wasStatsOpenRef.current) {
      restoreFocusIfAppropriate(statsRestoreFocusRef);
    }
    wasStatsOpenRef.current = showStats;
  }, [showStats]);

  useEffect(() => {
    if (!showSettings && wasSettingsOpenRef.current) {
      restoreFocusIfAppropriate(settingsRestoreFocusRef);
    }
    wasSettingsOpenRef.current = showSettings;
  }, [showSettings]);

  useEffect(() => {
    if (statusMoveOpen) {
      statusFirstActionRef.current?.focus();
    } else if (wasStatusMoveOpenRef.current) {
      restoreFocusIfAppropriate(statusRestoreFocusRef);
    }
    wasStatusMoveOpenRef.current = statusMoveOpen;
  }, [statusMoveOpen]);

  return {
    settingsRef,
    settingsTriggerRef,
    statsTriggerRef,
    statsCloseRef,
    statusFirstActionRef,
    rememberSettingsFocus: () => rememberCurrentFocus(settingsRestoreFocusRef),
    rememberStatsFocus: () => rememberCurrentFocus(statsRestoreFocusRef),
    rememberStatusMoveFocus: () => rememberCurrentFocus(statusRestoreFocusRef),
  };
}
