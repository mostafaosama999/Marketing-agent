// src/components/features/crm/CRMBoard.tsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Fab, Button, ThemeProvider, createTheme, Alert, Snackbar } from '@mui/material';
import { Add as AddIcon, UploadFile as UploadFileIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { Lead, LeadStatus } from '../../../types/lead';
import { CSVRow } from '../../../types/crm';
import { LeadDialog } from './LeadDialog';
import { LeadColumn } from './LeadColumn';
import { ViewToggle } from './ViewToggle';
import { CRMLeadsTable } from './CRMLeadsTable';
import { CSVUploadDialog } from './CSVUploadDialog';
import { CSVFieldMappingDialog } from './CSVFieldMappingDialog';
import {
  LeadOwnerFilter,
  CompanyFilter,
  MonthFilter,
  StatusFilter,
  SearchFilter,
  ActiveFiltersBar,
} from './filters';
import {
  subscribeToLeads,
  createLead,
  updateLeadStatus,
  deleteLead,
} from '../../../services/api/leads';

// Modern theme matching KanbanBoard
const modernTheme = createTheme({
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 700, fontSize: '28px', lineHeight: 1.2 },
    h6: { fontWeight: 600, fontSize: '16px' },
    subtitle1: { fontWeight: 400, fontSize: '15px', lineHeight: 1.4 },
    body1: { fontWeight: 500, fontSize: '14px' },
    body2: { fontWeight: 400, fontSize: '13px' },
    caption: { fontWeight: 400, fontSize: '12px' },
  },
});

// Lead pipeline columns (matching KanbanBoard structure)
const LEAD_COLUMNS = [
  {
    id: 'new_lead',
    title: 'New Lead',
    icon: '📋',
    color: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    headerColor: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
    count: 0
  },
  {
    id: 'qualified',
    title: 'Qualified',
    icon: '🎯',
    color: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)',
    headerColor: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
    count: 0
  },
  {
    id: 'contacted',
    title: 'Contacted',
    icon: '📞',
    color: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    headerColor: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
    count: 0
  },
  {
    id: 'follow_up',
    title: 'Follow up',
    icon: '🔄',
    color: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
    headerColor: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
    count: 0
  },
  {
    id: 'won',
    title: 'Won',
    icon: '✅',
    color: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
    headerColor: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
    count: 0
  },
  {
    id: 'lost',
    title: 'Lost',
    icon: '❌',
    color: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
    headerColor: 'linear-gradient(135deg, #607d8b 0%, #455a64 100%)',
    count: 0
  }
];

function CRMBoard() {
  const { userProfile, user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openLeadDetail, setOpenLeadDetail] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  // Filter states
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  // CSV Import states
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showCSVMapping, setShowCSVMapping] = useState(false);
  const [parsedCSVData, setParsedCSVData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);

  const [currentView, setCurrentView] = useState<'board' | 'table'>(() => {
    // Load view preference from localStorage
    const savedView = localStorage.getItem('crmViewMode');
    return (savedView === 'table' || savedView === 'board') ? savedView : 'board';
  });

  // Get columns with counts
  const getColumns = () => {
    return LEAD_COLUMNS.map(col => ({
      ...col,
      count: getLeadsForColumn(col.id as LeadStatus).length
    }));
  };

  // Subscribe to leads in real-time
  useEffect(() => {
    const unsubscribe = subscribeToLeads((leadsData) => {
      setLeads(leadsData);
    });

    return () => unsubscribe();
  }, []);

  // Helper functions
  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertOpen(true);
  };

  // Helper to get the most recent update date from stateHistory or updatedAt
  const getLastUpdateDate = (lead: Lead): Date | null => {
    // First, try to get the most recent timestamp from stateHistory
    if (lead.stateHistory) {
      const timestamps = Object.values(lead.stateHistory)
        .filter((timestamp): timestamp is string => timestamp !== undefined && timestamp !== null)
        .map(ts => new Date(ts))
        .filter(date => !isNaN(date.getTime()));

      if (timestamps.length > 0) {
        return new Date(Math.max(...timestamps.map(d => d.getTime())));
      }
    }

    // Fallback to updatedAt if available
    if (lead.updatedAt) {
      if (lead.updatedAt instanceof Date) {
        return lead.updatedAt;
      }
      if (typeof lead.updatedAt === 'string') {
        return new Date(lead.updatedAt);
      }
    }

    return null;
  };

  // Event handlers
  const handleDragStart = (e: any, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: any, targetStatus: string) => {
    e.preventDefault();

    if (!draggedLead || !user) return;

    const newStatus = targetStatus as LeadStatus;
    const oldStatus = draggedLead.status;

    if (oldStatus === newStatus) {
      setDraggedLead(null);
      return;
    }

    try {
      await updateLeadStatus(draggedLead.id, newStatus, user.uid);
      setDraggedLead(null);
    } catch (error) {
      console.error('Error updating lead status:', error);
      showAlert('Failed to update lead status. Please try again.');
      setDraggedLead(null);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDialogMode('edit');
    setOpenLeadDetail(true);
  };

  const handleAddLead = () => {
    setSelectedLead(null);
    setDialogMode('create');
    setOpenDialog(true);
  };

  const handleSaveLead = async (leadData: any) => {
    try {
      if (dialogMode === 'create') {
        if (!user) throw new Error('User not authenticated');
        await createLead(leadData, user.uid);
      } else if (selectedLead) {
        // Update handled by LeadDialog
      }
      setOpenDialog(false);
      setOpenLeadDetail(false);
      setSelectedLead(null);
    } catch (error) {
      console.error('Error saving lead:', error);
      showAlert('Failed to save lead. Please try again.');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;

    try {
      await deleteLead(leadId);
    } catch (error) {
      console.error('Error deleting lead:', error);
      showAlert('Failed to delete lead. Please try again.');
    }
  };

  // Helper function to check if lead matches search term
  const matchesSearch = (lead: Lead, term: string): boolean => {
    if (!term) return true;
    const searchLower = term.toLowerCase();
    const nameMatch = lead.name.toLowerCase().includes(searchLower);
    const emailMatch = lead.email.toLowerCase().includes(searchLower);
    const companyMatch = lead.company.toLowerCase().includes(searchLower);
    const phoneMatch = lead.phone ? lead.phone.toLowerCase().includes(searchLower) : false;
    return nameMatch || emailMatch || companyMatch || phoneMatch;
  };

  const getLeadsForColumn = (columnId: LeadStatus) => {
    let filteredLeads = leads.filter(lead => lead.status === columnId);

    // Apply search filter
    if (searchTerm) {
      filteredLeads = filteredLeads.filter(lead => matchesSearch(lead, searchTerm));
    }

    // Apply status filter (for board view, if specific statuses are selected)
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(columnId)) {
      return []; // Don't show this column if its status is not selected
    }

    // Apply owner filter if selected
    if (selectedOwner) {
      filteredLeads = filteredLeads.filter(lead =>
        lead.customFields?.lead_owner === selectedOwner
      );
    }

    // Apply company filter if selected
    if (selectedCompany) {
      filteredLeads = filteredLeads.filter(lead =>
        lead.company === selectedCompany
      );
    }

    // Apply month filter if selected
    if (selectedMonth) {
      filteredLeads = filteredLeads.filter(lead => {
        const lastUpdateDate = getLastUpdateDate(lead);

        if (!lastUpdateDate) {
          return false;
        }

        const leadYear = lastUpdateDate.getFullYear();
        const leadMonth = String(lastUpdateDate.getMonth() + 1).padStart(2, '0');
        const leadYearMonth = `${leadYear}-${leadMonth}`;

        return leadYearMonth === selectedMonth;
      });
    }

    return filteredLeads;
  };

  // Get all filtered leads for table view
  const getFilteredLeads = () => {
    let filteredLeads = [...leads];

    // Apply search filter
    if (searchTerm) {
      filteredLeads = filteredLeads.filter(lead => matchesSearch(lead, searchTerm));
    }

    // Apply status filter
    if (selectedStatuses.length > 0) {
      filteredLeads = filteredLeads.filter(lead =>
        selectedStatuses.includes(lead.status)
      );
    }

    // Apply owner filter
    if (selectedOwner) {
      filteredLeads = filteredLeads.filter(lead =>
        lead.customFields?.lead_owner === selectedOwner
      );
    }

    // Apply company filter
    if (selectedCompany) {
      filteredLeads = filteredLeads.filter(lead =>
        lead.company === selectedCompany
      );
    }

    // Apply month filter
    if (selectedMonth) {
      filteredLeads = filteredLeads.filter(lead => {
        const lastUpdateDate = getLastUpdateDate(lead);
        if (!lastUpdateDate) return false;

        const leadYear = lastUpdateDate.getFullYear();
        const leadMonth = String(lastUpdateDate.getMonth() + 1).padStart(2, '0');
        const leadYearMonth = `${leadYear}-${leadMonth}`;

        return leadYearMonth === selectedMonth;
      });
    }

    return filteredLeads;
  };

  const handleOwnerChange = (owner: string) => {
    setSelectedOwner(owner);
  };

  const handleCompanyChange = (company: string) => {
    setSelectedCompany(company);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
  };

  const handleViewChange = (view: 'board' | 'table') => {
    setCurrentView(view);
    localStorage.setItem('crmViewMode', view);
  };

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || !user) return;

    try {
      await updateLeadStatus(leadId, newStatus, user.uid);
    } catch (error) {
      console.error('Error updating lead status:', error);
      showAlert('Failed to update status. Please try again.');
    }
  };

  // Filter handlers
  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSelectedStatuses([]);
    setSelectedOwner('');
    setSelectedCompany('');
    setSelectedMonth('');
  };

  const handleRemoveStatus = (status: LeadStatus) => {
    setSelectedStatuses(prev => prev.filter(s => s !== status));
  };

  // CSV Import handlers
  const handleCSVUploadNext = (data: CSVRow[], headers: string[]) => {
    setParsedCSVData(data);
    setCsvHeaders(headers);
    setShowCSVUpload(false);
    setShowCSVMapping(true);
  };

  const handleCSVMappingBack = () => {
    setShowCSVMapping(false);
    setShowCSVUpload(true);
  };

  const handleCSVMappingClose = () => {
    setShowCSVMapping(false);
    setParsedCSVData([]);
    setCsvHeaders([]);
  };

  const handleCSVUploadClose = () => {
    setShowCSVUpload(false);
    setParsedCSVData([]);
    setCsvHeaders([]);
  };

  const columns = getColumns();

  return (
    <ThemeProvider theme={modernTheme}>
      <Box sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        height: 'calc(100vh - 48px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <Box sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          px: 3,
          py: 1.5,
          flexShrink: 0
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box>
              <Typography variant="h4" sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                fontWeight: 700,
                mb: 1
              }}>
                CRM Pipeline
              </Typography>
              <Typography variant="subtitle1" sx={{
                color: '#64748b',
                fontWeight: 400
              }}>
                Manage your leads efficiently
              </Typography>
            </Box>

            {/* View Toggle and Filters */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={() => setShowCSVUpload(true)}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 2,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                  },
                }}
              >
                Import CSV
              </Button>
              <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
              <ViewToggle
                view={currentView}
                onViewChange={handleViewChange}
              />
              <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
              <SearchFilter
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search leads..."
              />
              <StatusFilter
                selectedStatuses={selectedStatuses}
                onStatusesChange={setSelectedStatuses}
              />
              <LeadOwnerFilter
                selectedOwner={selectedOwner}
                onOwnerChange={handleOwnerChange}
                leads={leads}
              />
              <CompanyFilter
                selectedCompany={selectedCompany}
                onCompanyChange={handleCompanyChange}
                leads={leads}
              />
              <MonthFilter
                selectedMonth={selectedMonth}
                onMonthChange={handleMonthChange}
                leads={leads}
              />
            </Box>
          </Box>

          {/* Active Filters Bar */}
          <ActiveFiltersBar
            search={searchTerm}
            statuses={selectedStatuses}
            owner={selectedOwner}
            company={selectedCompany}
            month={selectedMonth}
            onRemoveSearch={() => setSearchTerm('')}
            onRemoveStatus={handleRemoveStatus}
            onRemoveOwner={() => setSelectedOwner('')}
            onRemoveCompany={() => setSelectedCompany('')}
            onRemoveMonth={() => setSelectedMonth('')}
            onClearAll={handleClearAllFilters}
          />
        </Box>

        {/* Content Area - Board or Table View */}
        {currentView === 'board' ? (
          <Box sx={{
            flex: 1,
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            overflowY: 'hidden',
            px: 3,
            py: 1.5,
          }}>
            {columns.map((column) => (
              <LeadColumn
                key={column.id}
                column={column}
                leads={getLeadsForColumn(column.id as LeadStatus)}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onLeadClick={handleLeadClick}
                onAddLead={() => setOpenDialog(true)}
                userProfile={userProfile}
              />
            ))}
          </Box>
        ) : (
          <Box sx={{
            flex: 1,
            px: 3,
            py: 1.5,
            overflow: 'hidden',
          }}>
            <CRMLeadsTable
              leads={getFilteredLeads()}
              onLeadClick={handleLeadClick}
              onDeleteLead={handleDeleteLead}
              onUpdateStatus={handleUpdateStatus}
            />
          </Box>
        )}

        {/* Floating Action Button */}
        <Fab
          onClick={handleAddLead}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              transform: 'scale(1.05)',
            },
          }}
        >
          <AddIcon />
        </Fab>

        {/* Alert Snackbar */}
        <Snackbar
          open={alertOpen}
          autoHideDuration={6000}
          onClose={() => setAlertOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setAlertOpen(false)} severity="warning">
            {alertMessage}
          </Alert>
        </Snackbar>

        {/* Lead Dialog */}
        <LeadDialog
          open={openDialog || openLeadDetail}
          onClose={() => {
            setOpenDialog(false);
            setOpenLeadDetail(false);
            setSelectedLead(null);
          }}
          onSave={handleSaveLead}
          lead={selectedLead || undefined}
          mode={dialogMode}
        />

        {/* CSV Upload Dialog */}
        <CSVUploadDialog
          open={showCSVUpload}
          onClose={handleCSVUploadClose}
          onNext={handleCSVUploadNext}
        />

        {/* CSV Field Mapping Dialog */}
        <CSVFieldMappingDialog
          open={showCSVMapping}
          onClose={handleCSVMappingClose}
          onBack={handleCSVMappingBack}
          data={parsedCSVData}
          headers={csvHeaders}
        />
      </Box>
    </ThemeProvider>
  );
}

export default CRMBoard;
