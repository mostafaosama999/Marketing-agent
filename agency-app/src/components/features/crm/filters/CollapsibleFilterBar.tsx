// src/components/features/crm/filters/CollapsibleFilterBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import { LeadStatus, Lead } from '../../../../types/lead';
import { Company } from '../../../../types/crm';
import { FilterState, FilterRule } from '../../../../types/filter';
import { FilterButton } from './FilterButton';
import { AdvancedFilterBuilder } from './AdvancedFilterBuilder';
import { SearchFilter } from './SearchFilter';
import { ActiveFiltersBar } from './ActiveFiltersBar';

interface CollapsibleFilterBarProps<T = Lead> {
  // Filter state (unified object)
  filters: FilterState | any;

  // Filter handlers
  onFiltersChange: (updates: Partial<FilterState> | any) => void;
  onClearAll: () => void;
  onApplyAdvancedFilters: (rules: FilterRule[]) => void;

  // Data for dropdowns
  data: T[];

  // Entity type for filtering
  entityType?: 'lead' | 'company';

  // Search placeholder
  searchPlaceholder?: string;
}

export const CollapsibleFilterBar = <T extends Lead | Company = Lead>({
  filters,
  onFiltersChange,
  onClearAll,
  onApplyAdvancedFilters,
  data,
  entityType = 'lead',
  searchPlaceholder = 'Search...',
}: CollapsibleFilterBarProps<T>) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Calculate active filter count (excluding search)
  const activeCount =
    (filters.statuses?.length || 0) +
    (filters.company ? 1 : 0) +
    (filters.month ? 1 : 0) +
    // Count custom field filters
    Object.keys(filters).filter(
      key => !['search', 'statuses', 'company', 'month'].includes(key) && filters[key]
    ).length;

  // Handle click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check if click is on a MUI portal element (dropdown menus)
      const isMuiPortal = (target as HTMLElement).closest?.('.MuiPopover-root, .MuiModal-root, .MuiPaper-root');

      if (
        isExpanded &&
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !isMuiPortal
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  // Handler for removing individual status
  const handleRemoveStatus = (status: LeadStatus) => {
    onFiltersChange({
      statuses: filters.statuses.filter((s: LeadStatus) => s !== status),
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
      {/* Top row: Search + Filter Button */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <SearchFilter
          value={filters.search}
          onChange={(search) => onFiltersChange({ search })}
          placeholder={searchPlaceholder}
        />

        <Box ref={panelRef} sx={{ position: 'relative' }}>
          <FilterButton
            activeCount={activeCount}
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
          />

          {/* Collapsible Advanced Filter Builder */}
          <Box
            sx={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              width: {
                xs: '600px',
                sm: '700px',
                md: '800px',
              },
              zIndex: 1000,
              bgcolor: 'transparent',
            }}
          >
            <AdvancedFilterBuilder
              isExpanded={isExpanded}
              onApplyFilters={(rules) => {
                onApplyAdvancedFilters(rules);
                setIsExpanded(false);
              }}
              onClearFilters={() => {
                onClearAll();
                setIsExpanded(false);
              }}
              data={data}
              entityType={entityType}
            />
          </Box>
        </Box>
      </Box>

      {/* Active Filters Chips Row */}
      {(filters.search || activeCount > 0) && (
        <ActiveFiltersBar
          search={filters.search}
          statuses={filters.statuses}
          owner={filters.lead_owner || ''}
          company={filters.company}
          month={filters.month}
          onRemoveSearch={() => onFiltersChange({ search: '' })}
          onRemoveStatus={handleRemoveStatus}
          onRemoveOwner={() => onFiltersChange({ lead_owner: '' })}
          onRemoveCompany={() => onFiltersChange({ company: '' })}
          onRemoveMonth={() => onFiltersChange({ month: '' })}
          onClearAll={onClearAll}
        />
      )}
    </Box>
  );
};
