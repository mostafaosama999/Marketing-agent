import { useState, useEffect } from 'react';
import { CustomField } from '../../../app/types/crm';

export interface CardFieldConfig {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean; // Cannot be hidden
  type: 'standard' | 'custom';
}

interface UseCardFieldVisibilityOptions {
  storageKey: string;
  customFields: CustomField[];
}

export function useCardFieldVisibility({ storageKey, customFields }: UseCardFieldVisibilityOptions) {
  // Define standard fields that are always available
  const standardFields: CardFieldConfig[] = [
    { id: 'name', label: 'Name', visible: true, required: true, type: 'standard' },
    { id: 'company', label: 'Company', visible: true, required: true, type: 'standard' },
    { id: 'email', label: 'Email', visible: true, required: false, type: 'standard' },
    { id: 'phone', label: 'Phone', visible: true, required: false, type: 'standard' },
    { id: 'api_costs', label: 'API Costs', visible: false, required: false, type: 'standard' },
  ];

  const [fields, setFields] = useState<CardFieldConfig[]>(() => {
    // Load from localStorage on initial render
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const storedConfig = JSON.parse(stored) as Record<string, boolean>;

        // Merge standard fields with stored visibility
        const mergedStandardFields = standardFields.map(field => ({
          ...field,
          visible: storedConfig[field.id] !== undefined ? storedConfig[field.id] : field.visible,
        }));

        // Add custom fields with stored visibility
        const customFieldConfigs: CardFieldConfig[] = customFields.map(cf => ({
          id: `custom_${cf.name}`,
          label: cf.label,
          visible: storedConfig[`custom_${cf.name}`] !== undefined
            ? storedConfig[`custom_${cf.name}`]
            : cf.showInCard && cf.visible,
          required: false,
          type: 'custom',
        }));

        return [...mergedStandardFields, ...customFieldConfigs];
      }
    } catch (error) {
      console.error('Error loading card field visibility from localStorage:', error);
    }

    // Default: standard fields + custom fields that have showInCard enabled
    const customFieldConfigs: CardFieldConfig[] = customFields.map(cf => ({
      id: `custom_${cf.name}`,
      label: cf.label,
      visible: cf.showInCard && cf.visible,
      required: false,
      type: 'custom',
    }));

    return [...standardFields, ...customFieldConfigs];
  });

  // Update fields when customFields prop changes
  useEffect(() => {
    setFields(prevFields => {
      // Keep standard fields as-is
      const currentStandardFields = prevFields.filter(f => f.type === 'standard');

      // Get current visibility settings for custom fields
      const currentVisibilityMap = prevFields.reduce((acc, field) => {
        acc[field.id] = field.visible;
        return acc;
      }, {} as Record<string, boolean>);

      // Add/update custom fields
      const customFieldConfigs: CardFieldConfig[] = customFields.map(cf => ({
        id: `custom_${cf.name}`,
        label: cf.label,
        visible: currentVisibilityMap[`custom_${cf.name}`] !== undefined
          ? currentVisibilityMap[`custom_${cf.name}`]
          : cf.showInCard && cf.visible,
        required: false,
        type: 'custom',
      }));

      return [...currentStandardFields, ...customFieldConfigs];
    });
  }, [customFields]);

  // Save to localStorage whenever fields change
  useEffect(() => {
    try {
      const visibilityMap = fields.reduce((acc, field) => {
        acc[field.id] = field.visible;
        return acc;
      }, {} as Record<string, boolean>);

      localStorage.setItem(storageKey, JSON.stringify(visibilityMap));
    } catch (error) {
      console.error('Error saving card field visibility to localStorage:', error);
    }
  }, [fields, storageKey]);

  const isFieldVisible = (fieldId: string): boolean => {
    const field = fields.find(f => f.id === fieldId);
    return field?.visible ?? false;
  };

  const visibleFields = fields.filter(f => f.visible);

  const standardVisibleFields = fields.filter(f => f.type === 'standard' && f.visible);
  const customVisibleFields = fields.filter(f => f.type === 'custom' && f.visible);

  return {
    fields,
    setFields,
    isFieldVisible,
    visibleFields,
    standardVisibleFields,
    customVisibleFields,
  };
}
