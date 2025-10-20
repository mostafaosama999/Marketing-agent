import { useState, useEffect } from 'react';
import { ColumnConfig } from '../components/ColumnVisibilityMenu';

interface UseColumnVisibilityOptions {
  storageKey: string;
  defaultColumns: ColumnConfig[];
}

export function useColumnVisibility({ storageKey, defaultColumns }: UseColumnVisibilityOptions) {
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    // Load from localStorage on initial render
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const storedColumns = JSON.parse(stored) as ColumnConfig[];

        // Create a map of stored columns for quick lookup
        const storedMap = new Map(storedColumns.map(col => [col.id, col]));

        // Merge stored columns with default columns
        // Use stored order if all columns are present, otherwise use default order
        const storedIds = new Set(storedColumns.map(c => c.id));
        const defaultIds = new Set(defaultColumns.map(c => c.id));

        // Check if stored columns match default columns (same IDs)
        const sameColumns = storedIds.size === defaultIds.size &&
          [...storedIds].every(id => defaultIds.has(id));

        if (sameColumns) {
          // Use stored order and merge with any new properties from defaults
          return storedColumns.map(storedCol => {
            const defaultCol = defaultColumns.find(c => c.id === storedCol.id);
            return {
              ...defaultCol,
              ...storedCol,
            };
          });
        } else {
          // Columns have changed (new columns added or removed)
          // Use default order but preserve visibility settings for existing columns
          return defaultColumns.map(col => ({
            ...col,
            visible: storedMap.has(col.id) ? storedMap.get(col.id)!.visible : col.visible,
          }));
        }
      }
    } catch (error) {
      console.error('Error loading column visibility from localStorage:', error);
    }

    return defaultColumns;
  });

  // Update columns when defaultColumns change (e.g., custom fields added/removed)
  useEffect(() => {
    const currentIds = new Set(columns.map(c => c.id));
    const defaultIds = new Set(defaultColumns.map(c => c.id));

    // Check if columns have changed
    const columnsChanged = currentIds.size !== defaultIds.size ||
      [...defaultIds].some(id => !currentIds.has(id));

    if (columnsChanged) {
      // Create a map of current columns for quick lookup
      const currentMap = new Map(columns.map(col => [col.id, col]));

      // Merge with new default columns, preserving visibility settings
      const updatedColumns = defaultColumns.map(col => ({
        ...col,
        visible: currentMap.has(col.id) ? currentMap.get(col.id)!.visible : col.visible,
      }));

      setColumns(updatedColumns);
    }
  }, [defaultColumns]); // Only watch defaultColumns, not columns to avoid infinite loop

  // Save to localStorage whenever columns change
  useEffect(() => {
    try {
      // Save the entire columns array including order
      localStorage.setItem(storageKey, JSON.stringify(columns));
    } catch (error) {
      console.error('Error saving column visibility to localStorage:', error);
    }
  }, [columns, storageKey]);

  const isColumnVisible = (columnId: string): boolean => {
    const column = columns.find(col => col.id === columnId);
    return column?.visible ?? true;
  };

  const visibleColumns = columns.filter(col => col.visible);

  return {
    columns,
    setColumns,
    isColumnVisible,
    visibleColumns,
  };
}
