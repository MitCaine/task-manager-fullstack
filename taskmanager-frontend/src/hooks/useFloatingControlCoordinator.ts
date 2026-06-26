import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

type CreateOpenControl = string | null;
type FloatingControl = 'priority' | 'project' | 'tags' | 'repeat';

type CloseFloatingControlOptions = {
  timeEditors?: boolean;
  createControls?: boolean;
  inlineEditControls?: boolean;
};

type UseFloatingControlCoordinatorOptions = {
  closeSettings: () => void;
  closeStats: () => void;
  closeStatusMove: () => void;
};

function toggleOpenControl(
  setOpenControl: Dispatch<SetStateAction<string | null>>,
  control: string,
  isActive: (current: string | null, control: string) => boolean = (current, next) => current === next,
) {
  setOpenControl(current => isActive(current, control) ? null : control);
}

function isCreateControlGroupActive(current: CreateOpenControl, control: Exclude<CreateOpenControl, null>): boolean {
  if (control === 'start') return current === 'start' || current === 'start-hour' || current === 'start-minute' || current === 'start-ampm';
  if (control === 'end') return current === 'end' || current === 'end-hour' || current === 'end-minute' || current === 'end-ampm';
  return current === control;
}

export default function useFloatingControlCoordinator({
  closeSettings,
  closeStats,
  closeStatusMove,
}: UseFloatingControlCoordinatorOptions) {
  const [openTimeEditorScope, setOpenTimeEditorScope] = useState<string | null>(null);
  const [openCreateControl, setOpenCreateControl] = useState<CreateOpenControl>(null);
  const [inlineEditOpenControl, setInlineEditOpenControl] = useState<string | null>(null);
  const [openActionTaskId, setOpenActionTaskId] = useState<number | null>(null);

  const closeFloatingControls = (options: CloseFloatingControlOptions = {}) => {
    setOpenActionTaskId(null);
    closeSettings();
    closeStats();
    closeStatusMove();
    if (options.inlineEditControls !== false) setInlineEditOpenControl(null);
    if (options.timeEditors !== false) setOpenTimeEditorScope(null);
    if (options.createControls !== false) setOpenCreateControl(null);
  };

  const toggleCreateDropdown = (control: FloatingControl) => {
    closeFloatingControls({ createControls: false });
    toggleOpenControl(setOpenCreateControl, control, isCreateControlGroupActive);
  };

  const toggleInlineEditDropdown = (control: FloatingControl) => {
    closeFloatingControls({ timeEditors: false, inlineEditControls: false });
    setOpenTimeEditorScope(null);
    toggleOpenControl(setInlineEditOpenControl, control);
  };

  useEffect(() => {
    if (!openCreateControl) return;
    const handler = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-create-menu-trigger]')) return;
      if (target.closest('[data-create-menu-boundary]')) return;
      setOpenCreateControl(null);
      setOpenTimeEditorScope(null);
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [openCreateControl]);

  useEffect(() => {
    if (!inlineEditOpenControl) return;
    const handler = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-create-menu-trigger]')) return;
      if (target.closest('[data-create-menu-boundary]')) return;
      if (target.closest('[data-inline-edit-menu-trigger]')) return;
      if (target.closest('[data-inline-edit-menu-boundary]')) return;
      setInlineEditOpenControl(null);
      setOpenTimeEditorScope(null);
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [inlineEditOpenControl]);

  useEffect(() => {
    if (openActionTaskId === null) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.item__actions')) setOpenActionTaskId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openActionTaskId]);

  return {
    openTimeEditorScope,
    setOpenTimeEditorScope,
    openCreateControl,
    setOpenCreateControl,
    inlineEditOpenControl,
    setInlineEditOpenControl,
    openActionTaskId,
    setOpenActionTaskId,
    closeFloatingControls,
    toggleCreateDropdown,
    toggleInlineEditDropdown,
  };
}
