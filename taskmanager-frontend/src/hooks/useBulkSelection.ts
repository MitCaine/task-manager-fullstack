import { useCallback, useState } from 'react';

export default function useBulkSelection() {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number>>(new Set());

  const clearBulkSelection = useCallback(() => {
    setBulkSelectedIds(new Set());
    setBulkMode(false);
  }, []);

  const toggleBulkMode = useCallback(() => {
    setBulkMode(current => !current);
    setBulkSelectedIds(new Set());
  }, []);

  const toggleBulkSelection = useCallback((taskId: number) => {
    setBulkSelectedIds(current => {
      const next = new Set(current);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }, []);

  return {
    bulkMode,
    bulkSelectedIds,
    setBulkMode,
    setBulkSelectedIds,
    clearBulkSelection,
    toggleBulkMode,
    toggleBulkSelection,
  };
}
