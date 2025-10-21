// src/components/features/crm/filters/CollapsibleFilterBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import { LeadStatus, Lead } from '../../../../types/lead';
import { FilterButton } from './FilterButton';
import { FilterPanel } from './FilterPanel';
import { SearchFilter } from './SearchFilter';
import { ActiveFiltersBar } from './ActiveFiltersBar';

interface CollapsibleFilterBarProps {
  // Filter states
  searchTerm: string;
  selectedStatuses: LeadStatus[];
  selectedOwner: string;
  selectedCompany: string;
  selectedMonth: string;

  // Filter handlers
  onSearchChange: (term: string) => void;
  onStatusesChange: (statuses: LeadStatus[]) => void;
  onOwnerChange: (owner: string) => void;
  onCompanyChange: (company: string) => void;
  onMonthChange: (month: string) => void;
  onClearAll: () => void;

  // Data for dropdowns
  leads: Lead[];
}

export const CollapsibleFilterBar: React.FC<CollapsibleFilterBarProps> = ({
  searchTerm,
  selectedStatuses,
  selectedOwner,
  selectedCompany,
  selectedMonth,
  onSearchChange,
  onStatusesChange,
  onOwnerChange,
  onCompanyChange,
  onMonthChange,
  onClearAll,
  leads,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Calculate active filter count (excluding search)
  const activeCount =
    selectedStatuses.length +
    (selectedOwner ? 1 : 0) +
    (selectedCompany ? 1 : 0) +
    (selectedMonth ? 1 : 0);

  // Handle click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isExpanded &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
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
    onStatusesChange(selectedStatuses.filter(s => s !== status));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
      {/* Top row: Search + Filter Button */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <SearchFilter
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Search leads..."
        />

        <Box ref={panelRef} sx={{ position: 'relative' }}>
          <FilterButton
            activeCount={activeCount}
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
          />

          {/* Collapsible Filter Panel */}
          <Box
            sx={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              width: {
                xs: '340px',
                sm: '400px',
                md: '500px',
              },
              zIndex: 1000,
            }}
          >
            <FilterPanel
              isExpanded={isExpanded}
              selectedStatuses={selectedStatuses}
              selectedOwner={selectedOwner}
              selectedCompany={selectedCompany}
              selectedMonth={selectedMonth}
              onStatusesChange={onStatusesChange}
              onOwnerChange={onOwnerChange}
              onCompanyChange={onCompanyChange}
              onMonthChange={onMonthChange}
              onClearAll={() => {
                onClearAll();
                setIsExpanded(false);
              }}
              leads={leads}
            />
          </Box>
        </Box>
      </Box>

      {/* Active Filters Chips Row */}
      {(searchTerm || activeCount > 0) && (
        <ActiveFiltersBar
          search={searchTerm}
          statuses={selectedStatuses}
          owner={selectedOwner}
          company={selectedCompany}
          month={selectedMonth}
          onRemoveSearch={() => onSearchChange('')}
          onRemoveStatus={handleRemoveStatus}
          onRemoveOwner={() => onOwnerChange('')}
          onRemoveCompany={() => onCompanyChange('')}
          onRemoveMonth={() => onMonthChange('')}
          onClearAll={onClearAll}
        />
      )}
    </Box>
  );
};
