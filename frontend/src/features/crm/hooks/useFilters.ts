import { useState, useEffect, useMemo } from 'react';
import { FilterCondition, FilterPreset, FilterOperator, FilterConnector } from '../../../app/types/filters';
import { applyFilters as applyFilterUtil } from '../../../utils/filterUtils';

interface UseFiltersOptions {
  storageKey: string;          // localStorage key for filters
  presetsStorageKey: string;   // localStorage key for presets
}

interface UseFiltersReturn<T> {
  // Filter conditions
  conditions: FilterCondition[];
  setConditions: (conditions: FilterCondition[]) => void;

  // Filtered data
  filteredData: T[];

  // Filter management
  addFilter: (field: string, operator: FilterOperator, value: any, connector?: FilterConnector) => void;
  updateFilter: (id: string, updates: Partial<FilterCondition>) => void;
  removeFilter: (id: string) => void;
  clearFilters: () => void;

  // Presets
  presets: FilterPreset[];
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;

  // Utility
  hasActiveFilters: boolean;
}

export function useFilters<T>(
  data: T[],
  options: UseFiltersOptions
): UseFiltersReturn<T> {
  const { storageKey, presetsStorageKey } = options;

  // Load initial conditions from localStorage
  const [conditions, setConditions] = useState<FilterCondition[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading filters from localStorage:', error);
    }
    return [];
  });

  // Load presets from localStorage
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    try {
      const stored = localStorage.getItem(presetsStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        return parsed.map((preset: any) => ({
          ...preset,
          createdAt: new Date(preset.createdAt),
        }));
      }
    } catch (error) {
      console.error('Error loading presets from localStorage:', error);
    }
    return [];
  });

  // Save conditions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(conditions));
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
    }
  }, [conditions, storageKey]);

  // Save presets to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(presetsStorageKey, JSON.stringify(presets));
    } catch (error) {
      console.error('Error saving presets to localStorage:', error);
    }
  }, [presets, presetsStorageKey]);

  // Apply filters to data
  const filteredData = useMemo(() => {
    return applyFilterUtil(data, conditions);
  }, [data, conditions]);

  // Add a new filter
  const addFilter = (
    field: string,
    operator: FilterOperator,
    value: any,
    connector: FilterConnector = 'AND'
  ) => {
    const newCondition: FilterCondition = {
      id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      field,
      operator,
      value,
      connector,
    };
    setConditions(prev => [...prev, newCondition]);
  };

  // Update an existing filter
  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    setConditions(prev =>
      prev.map(condition =>
        condition.id === id ? { ...condition, ...updates } : condition
      )
    );
  };

  // Remove a filter
  const removeFilter = (id: string) => {
    setConditions(prev => prev.filter(condition => condition.id !== id));
  };

  // Clear all filters
  const clearFilters = () => {
    setConditions([]);
  };

  // Save current filters as a preset
  const savePreset = (name: string) => {
    if (!name.trim()) {
      throw new Error('Preset name cannot be empty');
    }

    if (conditions.length === 0) {
      throw new Error('Cannot save preset with no filters');
    }

    const newPreset: FilterPreset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      conditions: [...conditions],
      createdAt: new Date(),
    };

    setPresets(prev => [...prev, newPreset]);
  };

  // Load a preset
  const loadPreset = (id: string) => {
    const preset = presets.find(p => p.id === id);
    if (preset) {
      setConditions([...preset.conditions]);
    }
  };

  // Delete a preset
  const deletePreset = (id: string) => {
    setPresets(prev => prev.filter(p => p.id !== id));
  };

  return {
    conditions,
    setConditions,
    filteredData,
    addFilter,
    updateFilter,
    removeFilter,
    clearFilters,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    hasActiveFilters: conditions.length > 0,
  };
}
