import { useState, useCallback, useRef, useEffect } from 'react';

export interface ColumnWidths {
  [key: string]: number;
}

const DEFAULT_COLUMN_WIDTH = 150;
const MIN_COLUMN_WIDTH = 80;

export const useColumnResize = (columnKeys: string[]) => {
  // Initialize column widths from localStorage or defaults
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    const stored = localStorage.getItem('crm-column-widths');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  });

  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Save to localStorage whenever widths change
  useEffect(() => {
    localStorage.setItem('crm-column-widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  const getColumnWidth = useCallback(
    (columnKey: string): number => {
      return columnWidths[columnKey] || DEFAULT_COLUMN_WIDTH;
    },
    [columnWidths]
  );

  const handleMouseDown = useCallback(
    (columnKey: string, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setResizingColumn(columnKey);
      startXRef.current = event.clientX;
      startWidthRef.current = getColumnWidth(columnKey);
    },
    [getColumnWidth]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!resizingColumn) return;

      const diff = event.clientX - startXRef.current;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidthRef.current + diff);

      setColumnWidths((prev) => ({
        ...prev,
        [resizingColumn]: newWidth,
      }));
    },
    [resizingColumn]
  );

  const handleMouseUp = useCallback(() => {
    setResizingColumn(null);
  }, []);

  // Add global event listeners when resizing
  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [resizingColumn, handleMouseMove, handleMouseUp]);

  const resetColumnWidths = useCallback(() => {
    setColumnWidths({});
    localStorage.removeItem('crm-column-widths');
  }, []);

  return {
    columnWidths,
    getColumnWidth,
    handleMouseDown,
    resizingColumn,
    resetColumnWidths,
  };
};
