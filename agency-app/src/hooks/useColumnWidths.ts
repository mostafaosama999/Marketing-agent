import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'column_widths_';
const MIN_WIDTH = 60;

export type ColumnWidthMap = Record<string, number>;

export interface UseColumnWidthsResult {
  widths: ColumnWidthMap;
  getWidth: (columnId: string) => number | undefined;
  setWidth: (columnId: string, width: number) => void;
  resetWidth: (columnId: string) => void;
  resetAll: () => void;
}

export function useColumnWidths(storageKey: string): UseColumnWidthsResult {
  const fullKey = STORAGE_PREFIX + storageKey;

  const [widths, setWidths] = useState<ColumnWidthMap>(() => {
    try {
      const saved = localStorage.getItem(fullKey);
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') return parsed;
      return {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(fullKey, JSON.stringify(widths));
    } catch {
      // localStorage may be full or unavailable
    }
  }, [fullKey, widths]);

  const getWidth = useCallback((columnId: string) => widths[columnId], [widths]);

  const setWidth = useCallback((columnId: string, width: number) => {
    setWidths(prev => ({ ...prev, [columnId]: Math.max(MIN_WIDTH, Math.round(width)) }));
  }, []);

  const resetWidth = useCallback((columnId: string) => {
    setWidths(prev => {
      if (!(columnId in prev)) return prev;
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
  }, []);

  const resetAll = useCallback(() => setWidths({}), []);

  return { widths, getWidth, setWidth, resetWidth, resetAll };
}
