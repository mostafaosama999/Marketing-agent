// src/components/features/kanban/KanbanBoard.tsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Fab, ThemeProvider, createTheme, Alert, Snackbar } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { useClient } from '../../../hooks/useClients';
import { db } from '../../../services/firebase/firestore';
import { ticketsService } from '../../../services/api/tickets';
import { ticketContentService, ticketFinancialsService, ticketTimelineService } from '../../../services/api/ticketSubcollections';
import { Ticket, TicketStatus, TicketPriority } from '../../../types';
import { UserProfile } from '../../../types/auth';
import TaskDetailModal from './TaskDetailModal';
import AddTaskModal from './AddTaskModal';
import PricingModal from './PricingModal';
import HoursInputModal from './HoursInputModal';
import KanbanColumn from './KanbanColumn';
import WriterFilter from './WriterFilter';
import ClientFilter from './ClientFilter';
import MonthFilter from './MonthFilter';
import ViewToggle from './ViewToggle';
import LeadsTable from './LeadsTable';

// Helper function to send Slack notifications
const sendSlackNotification = async (ticketData: any, oldStatus: string | null, newStatus: string, updatedBy: string) => {
  const payload = {
    ticketId: ticketData.id,
    ticketTitle: ticketData.title,
    clientName: ticketData.clientName,
    writerName: ticketData.assignedTo,
    oldStatus: oldStatus,
    newStatus: newStatus,
    updatedBy: updatedBy
  };

  try {
    const response = await fetch('https://us-central1-ai-adv-5e502.cloudfunctions.net/taskStatusNotification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to send Slack notification:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText
      });
    } else {
      await response.json();
    }
  } catch (error) {
    console.error('💥 Error sending Slack notification:', error);
  }
};

// Modern theme
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

const BASE_COLUMNS = [
  { 
    id: 'todo', 
    title: 'Backlog', 
    icon: '📋',
    color: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    headerColor: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
    count: 0
  },
  { 
    id: 'in_progress', 
    title: 'In Progress', 
    icon: '⏳',
    color: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    headerColor: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
    count: 0
  },
  { 
    id: 'internal_review', 
    title: 'Internal Review', 
    icon: '👀',
    color: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)',
    headerColor: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
    count: 0
  },
  { 
    id: 'client_review', 
    title: 'Client Review', 
    icon: '📋',
    color: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
    headerColor: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
    count: 0
  },
  { 
    id: 'done', 
    title: 'Done', 
    icon: '✅',
    color: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
    headerColor: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
    count: 0
  }
];

const CEO_COLUMNS = [
  { 
    id: 'invoiced', 
    title: 'Invoiced', 
    icon: '💰',
    color: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
    headerColor: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
    count: 0
  },
  { 
    id: 'paid', 
    title: 'Paid', 
    icon: '💎',
    color: 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)',
    headerColor: 'linear-gradient(135deg, #009688 0%, #00695c 100%)',
    count: 0
  }
];

function KanbanBoard() {
  const { userProfile } = useAuth();
  const { clients } = useClient(); // Fetch clients for onboarding detection
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]); // Fetch users for onboarding detection
  const [draggedTicket, setDraggedTicket] = useState<Ticket | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTaskDetail, setOpenTaskDetail] = useState(false);
  const [openPricingModal, setOpenPricingModal] = useState(false);
  const [openHoursModal, setOpenHoursModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [selectedWriter, setSelectedWriter] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [currentView, setCurrentView] = useState<'board' | 'table'>(() => {
    // Load view preference from localStorage
    const savedView = localStorage.getItem('kanbanViewMode');
    return (savedView === 'table' || savedView === 'board') ? savedView : 'board';
  });
  const [newTicket, setNewTicket] = useState<{
    title: string;
    description: string;
    priority: TicketPriority;
    type: 'blog' | 'tutorial';
    assignedTo: string;
    reviewedBy: string;
    clientName: string;
    writerName: string;
    status: TicketStatus;
    dueDate: string;
    aiReviewCompleted: boolean;
  }>({
    title: '',
    description: '',
    priority: 'medium',
    type: 'blog',
    assignedTo: '',
    reviewedBy: '',
    clientName: '',
    writerName: '',
    status: 'todo',
    dueDate: '',
    aiReviewCompleted: false
  });

  // Get columns based on user role
  const getColumns = () => {
    const columns = [...BASE_COLUMNS];
    if (userProfile?.role === 'CEO') {
      columns.push(...CEO_COLUMNS);
    }
    return columns.map(col => ({
      ...col,
      count: getTicketsForColumn(col.id).length
    }));
  };

  useEffect(() => {
    const unsubscribe = ticketsService.subscribeToTickets(async (ticketsData) => {
      // Load financial and timeline data for all tickets
      const ticketsWithSubcollections = await Promise.all(
        ticketsData.map(async (ticket) => {
          let updatedTicket = { ...ticket };

          try {
            // Load timeline data for all tickets (for state duration tracking)
            const timeline = await ticketTimelineService.getTimeline(ticket.id);
            if (timeline) {
              updatedTicket = {
                ...updatedTicket,
                stateHistory: timeline.stateHistory,
                stateDurations: timeline.stateDurations
              };
            }

            // Load financial data for tickets in financial statuses
            if (ticket.status === 'done' || ticket.status === 'invoiced' || ticket.status === 'paid') {
              const financials = await ticketFinancialsService.getFinancials(ticket.id);
              updatedTicket = {
                ...updatedTicket,
                totalCost: financials?.totalCost || 0,
                actualRevenue: financials?.actualRevenue || 0,
                estimatedRevenue: financials?.estimatedRevenue || 0
              };
            }
          } catch (error) {
            console.warn(`Failed to load subcollections for ticket ${ticket.id}:`, error);
          }

          return updatedTicket;
        })
      );
      setTickets(ticketsWithSubcollections);
    });

    return () => unsubscribe();
  }, []);

  // Fetch users for onboarding detection
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersData: UserProfile[] = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          displayName: doc.data().displayName || doc.data().email || 'Unknown',
          email: doc.data().email || '',
          role: doc.data().role || 'Writer',
          joinDate: doc.data().joinDate || '',
          ...(doc.data() as any) // Include any additional fields like createdAt
        } as UserProfile));
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);

  // Helper functions
  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertOpen(true);
  };

  // Helper to check if ticket has content submitted
  const hasContentSubmitted = async (ticketId: string): Promise<boolean> => {
    try {
      const content = await ticketContentService.getContent(ticketId);
      return !!(content?.content && content.content.trim() !== '');
    } catch (error) {
      console.error('Error checking content:', error);
      return false;
    }
  };

  // Helper to check if ticket has a review score for the CURRENT internal_review session
  const hasReviewForCurrentSession = async (ticketId: string): Promise<boolean> => {
    try {
      // Get timeline to find when current internal_review session started
      const timeline = await ticketTimelineService.getTimeline(ticketId);
      const currentSessionStart = timeline?.stateHistory?.internal_review;

      if (!currentSessionStart) {
        return false;
      }

      // Get review history
      const content = await ticketContentService.getContent(ticketId);
      const reviewHistory = content?.reviewHistory || [];

      // Check if any review was created AFTER current session started
      const hasRecentReview = reviewHistory.some(review => {
        const reviewTime = new Date(review.reviewedAt);
        const sessionTime = new Date(currentSessionStart);
        const isAfterSession = reviewTime > sessionTime;
        return isAfterSession;
      });
      return hasRecentReview;
    } catch (error) {
      console.error('Error checking review for current session:', error);
      return false;
    }
  };

  // Helper to get the most recent update date from stateHistory or updatedAt
  const getLastUpdateDate = (ticket: Ticket): Date | null => {
    // First, try to get the most recent timestamp from stateHistory
    if (ticket.stateHistory) {
      const timestamps = Object.values(ticket.stateHistory)
        .filter((timestamp): timestamp is string => timestamp !== undefined && timestamp !== null)
        .map(ts => new Date(ts))
        .filter(date => !isNaN(date.getTime()));

      if (timestamps.length > 0) {
        // Return the most recent timestamp
        return new Date(Math.max(...timestamps.map(d => d.getTime())));
      }
    }

    // Fallback to updatedAt if available
    if (ticket.updatedAt) {
      // Handle different date formats (Firestore timestamp, Date, string)
      if (ticket.updatedAt.toDate && typeof ticket.updatedAt.toDate === 'function') {
        return ticket.updatedAt.toDate();
      }
      if (ticket.updatedAt instanceof Date) {
        return ticket.updatedAt;
      }
      if (typeof ticket.updatedAt === 'string') {
        return new Date(ticket.updatedAt);
      }
    }

    return null;
  };

  // TODO: These functions will be moved to a proper client service later
  const getClientCompensationRate = async (): Promise<number | null> => {
    // For now, return null - this will be implemented with proper client service
    return null;
  };

  const checkCompensationNeedsHours = async (): Promise<boolean> => {
    // Check if we need to collect hours for cost calculation
    // For now, we'll always prompt for hours when moving to 'done' to ensure proper cost tracking
    return true;
  };

  // Event handlers
  const handleDragStart = (e: any, ticket: any) => {
    setDraggedTicket(ticket);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(ticket));
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: any, columnId: any) => {
    e.preventDefault();

    const isManager = userProfile?.role === 'Manager';

    // For managers, prevent dropping onto columns they shouldn't interact with
    if (isManager && (columnId === 'invoiced' || columnId === 'paid')) {
      showAlert('Managers cannot move tickets to Invoiced or Paid columns. These tickets appear in the Done column.');
      setDraggedTicket(null);
      return;
    }

    if (draggedTicket && draggedTicket.status !== columnId) {
      // Check if trying to move out of backlog without being assigned
      if (columnId !== 'todo' && (!draggedTicket.assignedTo || draggedTicket.assignedTo.trim() === '')) {
        showAlert('Ticket cannot be moved from Backlog without being assigned to someone first.');
        setDraggedTicket(null);
        return;
      }

      // Check if trying to move FROM "internal_review" to "client_review" or "done" without content submission
      if (draggedTicket.status === 'internal_review' && (columnId === 'client_review' || columnId === 'done')) {
        const hasContent = await hasContentSubmitted(draggedTicket.id);
        if (!hasContent) {
          showAlert(`Ticket cannot be moved from Internal Review to ${columnId === 'client_review' ? 'Client Review' : 'Done'} without content submission. Please submit content first.`);
          setDraggedTicket(null);
          return;
        }
      }

      // Check if trying to move FROM "internal_review" without a NEW manager review score for current session
      if (draggedTicket.status === 'internal_review' && (columnId === 'in_progress' || columnId === 'client_review')) {
        const hasReviewForSession = await hasReviewForCurrentSession(draggedTicket.id);
        if (!hasReviewForSession) {
          const destination = columnId === 'in_progress' ? 'In Progress' : 'Client Review';
          showAlert(`Ticket cannot be moved from Internal Review to ${destination} without a NEW manager review score for this review session. Please assign a fresh score before moving.`);
          setDraggedTicket(null);
          return;
        }
      }

      // Basic status update without complex review tracking for now
      // TODO: Implement proper review tracking using content subcollection

      // Handle CEO revenue tracking columns
      if ((columnId === 'invoiced' || columnId === 'paid') && userProfile?.role === 'CEO') {
        const clientRate = await getClientCompensationRate();

        if (clientRate && clientRate > 0) {
          try {
            // Store original status before updating
            const originalStatus = draggedTicket.status;

            // Update ticket status
            await ticketsService.updateTicketStatus(draggedTicket.id, columnId as TicketStatus, userProfile?.displayName || 'Unknown User', 'Auto-pricing applied');

            // Update financials
            await ticketFinancialsService.updateFinancials(draggedTicket.id, {
              actualRevenue: clientRate
            });

            // Send Slack notification with correct old status
            await sendSlackNotification(draggedTicket, originalStatus, columnId, userProfile?.displayName || 'Unknown User');
          } catch (error) {
            console.error('Error updating ticket with auto-pricing:', error);
          }
        } else {
          setSelectedTicket(draggedTicket);
          setTargetColumn(columnId);
          setOpenPricingModal(true);
        }
      } 
      // Handle "Done" column with cost calculation
      else if (columnId === 'done' && draggedTicket.status !== 'done') {
        const assigneeNeedsHours = await checkCompensationNeedsHours();
        const reviewerNeedsHours = await checkCompensationNeedsHours();

        if (assigneeNeedsHours || reviewerNeedsHours) {
          setSelectedTicket({ ...draggedTicket, status: 'done' as TicketStatus });
          setOpenHoursModal(true);
        } else {
          try {
            // Store original status before updating
            const originalStatus = draggedTicket.status;

            // Use the new completeTicketWithCosts method which handles all subcollections
            await ticketsService.completeTicketWithCosts(
              draggedTicket.id,
              {
                totalCost: 0, // Default values - will be calculated properly later
                costBreakdown: {
                  assigneeCost: 0,
                  reviewerCost: 0,
                  assigneeRate: 0,
                  reviewerRate: 0
                }
              },
              userProfile?.displayName || 'Unknown User'
            );

            // Send Slack notification with correct old status
            await sendSlackNotification(draggedTicket, originalStatus, columnId, userProfile?.displayName || 'Unknown User');
          } catch (error) {
            console.error('Error updating ticket:', error);
          }
        }
      } 
      // Normal status update
      else {
        try {
          // Store original status before updating
          const originalStatus = draggedTicket.status;

          await ticketsService.updateTicketStatus(
            draggedTicket.id,
            columnId as TicketStatus,
            userProfile?.displayName || 'Unknown User',
            'Status updated via drag and drop'
          );

          // Send Slack notification with correct old status
          await sendSlackNotification(draggedTicket, originalStatus, columnId, userProfile?.displayName || 'Unknown User');
        } catch (error) {
          console.error('Error updating ticket:', error);
        }
      }
    }
    
    setDraggedTicket(null);
  };

  const handleTicketClick = (ticket: any) => {
    setSelectedTicket(ticket);
    setOpenTaskDetail(true);
  };

  const handleUpdateTicket = async (updates: any) => {
    if (!selectedTicket) return;

    try {
      await ticketsService.updateTicket(selectedTicket.id, updates);
      setOpenTaskDetail(false);
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      await ticketsService.deleteTicket(ticketId);
      showAlert('Ticket deleted successfully');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      showAlert('Failed to delete ticket. Please try again.');
    }
  };

  const handlePricingSubmit = async (actualRevenue: number) => {
    if (!selectedTicket || !targetColumn) return;

    try {
      // Update ticket status
      await ticketsService.updateTicketStatus(
        selectedTicket.id,
        targetColumn as TicketStatus,
        userProfile?.displayName || 'Unknown User',
        `Manual pricing set: $${actualRevenue}`
      );

      // Update financials
      await ticketFinancialsService.updateFinancials(selectedTicket.id, {
        actualRevenue: actualRevenue
      });

      setOpenPricingModal(false);
      setSelectedTicket(null);
      setTargetColumn('');
    } catch (error) {
      console.error('Error updating ticket with pricing:', error);
    }
  };

  const handleHoursComplete = async (hoursData: any) => {
    if (!selectedTicket) return;

    try {
      // Store the original status before updating
      const originalStatus = selectedTicket.status;

      await ticketsService.completeTicketWithCosts(
        selectedTicket.id,
        {
          assigneeHours: hoursData.assigneeHours,
          reviewerHours: hoursData.reviewerHours,
          totalCost: hoursData.totalCost,
          costBreakdown: hoursData.costBreakdown
        },
        userProfile?.displayName || 'Unknown User'
      );

      // Send Slack notification for completion with correct old status
      await sendSlackNotification(selectedTicket, originalStatus, 'done', userProfile?.displayName || 'Unknown User');

      setOpenHoursModal(false);
      setSelectedTicket(null);
    } catch (error) {
      console.error('Error completing ticket with costs:', error);
    }
  };

  const handleHoursModalClose = () => {
    setOpenHoursModal(false);
    setSelectedTicket(null);
  };

  const handleAddTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.type) return;

    try {
      const ticketData: Omit<Ticket, 'id'> = {
        ...newTicket,
        dueDate: newTicket.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const ticketId = await ticketsService.createTicket(ticketData, userProfile?.displayName);

      // Send Slack notification for new ticket creation
      await sendSlackNotification(
        { id: ticketId, ...newTicket },
        null,
        'todo',
        userProfile?.displayName || 'Unknown User'
      );

      setNewTicket({
        title: '',
        description: '',
        priority: 'medium',
        type: 'blog',
        assignedTo: '',
        reviewedBy: '',
        clientName: '',
        writerName: '',
        status: 'todo',
        dueDate: '',
        aiReviewCompleted: false
      });
      setOpenDialog(false);
    } catch (error) {
      console.error('Error adding ticket:', error);
    }
  };

  const getTicketsForColumn = (columnId: any) => {
    const isManager = userProfile?.role === 'Manager';

    let filteredTickets: Ticket[];

    // Special handling for Manager view of Done column
    if (isManager && columnId === 'done') {
      // For managers, show done, invoiced, and paid tickets in Done column
      filteredTickets = tickets.filter(ticket =>
        ticket.status === 'done' ||
        ticket.status === 'invoiced' ||
        ticket.status === 'paid'
      );
    } else if (isManager && (columnId === 'invoiced' || columnId === 'paid')) {
      // Managers should not see invoiced or paid columns separately
      // Return empty array since these tickets appear in Done column for managers
      filteredTickets = [];
    } else {
      // Normal filtering for CEO and other columns
      filteredTickets = tickets.filter(ticket => ticket.status === columnId);
    }
    
    // Apply writer filter if selected (filter by assigned writer only)
    if (selectedWriter) {
      filteredTickets = filteredTickets.filter(ticket =>
        ticket.assignedTo === selectedWriter
      );
    }

    // Apply client filter if selected
    if (selectedClient) {
      filteredTickets = filteredTickets.filter(ticket =>
        ticket.clientName === selectedClient
      );
    }
    
    // Apply month filter if selected (filter by most recent update date)
    if (selectedMonth) {
      filteredTickets = filteredTickets.filter(ticket => {
        const lastUpdateDate = getLastUpdateDate(ticket);

        if (!lastUpdateDate) {
          return false;
        }

        const ticketYear = lastUpdateDate.getFullYear();
        const ticketMonth = String(lastUpdateDate.getMonth() + 1).padStart(2, '0');
        const ticketYearMonth = `${ticketYear}-${ticketMonth}`;

        return ticketYearMonth === selectedMonth;
      });
    }

    return filteredTickets;
  };

  const handleWriterChange = (writer: string) => {
    setSelectedWriter(writer);
  };

  const handleClientChange = (client: string) => {
    setSelectedClient(client);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
  };

  const handleViewChange = (view: 'board' | 'table') => {
    setCurrentView(view);
    localStorage.setItem('kanbanViewMode', view);
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: TicketStatus) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    try {
      const originalStatus = ticket.status;
      await ticketsService.updateTicketStatus(
        ticketId,
        newStatus,
        userProfile?.displayName || 'Unknown User',
        'Status updated from table view'
      );

      // Send Slack notification
      await sendSlackNotification(ticket, originalStatus, newStatus, userProfile?.displayName || 'Unknown User');
    } catch (error) {
      console.error('Error updating ticket status:', error);
      showAlert('Failed to update status. Please try again.');
    }
  };

  const columns = getColumns();

  // Get all filtered tickets for table view
  const getFilteredTickets = () => {
    let filteredTickets = [...tickets];

    // Apply writer filter
    if (selectedWriter) {
      filteredTickets = filteredTickets.filter(ticket =>
        ticket.assignedTo === selectedWriter
      );
    }

    // Apply client filter
    if (selectedClient) {
      filteredTickets = filteredTickets.filter(ticket =>
        ticket.clientName === selectedClient
      );
    }

    // Apply month filter
    if (selectedMonth) {
      filteredTickets = filteredTickets.filter(ticket => {
        const lastUpdateDate = getLastUpdateDate(ticket);
        if (!lastUpdateDate) return false;

        const ticketYear = lastUpdateDate.getFullYear();
        const ticketMonth = String(lastUpdateDate.getMonth() + 1).padStart(2, '0');
        const ticketYearMonth = `${ticketYear}-${ticketMonth}`;

        return ticketYearMonth === selectedMonth;
      });
    }

    // For managers viewing the table, show done/invoiced/paid tickets together
    const isManager = userProfile?.role === 'Manager';
    if (isManager) {
      // No special filtering needed - just show all tickets
      // The status display in the table will handle the labeling
    }

    return filteredTickets;
  };

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
                Project Management
              </Typography>
              <Typography variant="subtitle1" sx={{ 
                color: '#64748b',
                fontWeight: 400
              }}>
                Manage your content projects efficiently
                {userProfile?.role === 'CEO' && (
                  <Typography component="span" sx={{ 
                    ml: 2, 
                    color: '#7c3aed', 
                    fontWeight: 600,
                    '&::before': { content: '"•"', mr: 1 }
                  }}>
                    CEO View: Revenue tracking enabled
                  </Typography>
                )}
              </Typography>
            </Box>
            
            {/* View Toggle and Filters */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <ViewToggle
                view={currentView}
                onViewChange={handleViewChange}
              />
              <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
              <WriterFilter
                selectedWriter={selectedWriter}
                onWriterChange={handleWriterChange}
              />
              <ClientFilter
                selectedClient={selectedClient}
                onClientChange={handleClientChange}
              />
              <MonthFilter
                selectedMonth={selectedMonth}
                onMonthChange={handleMonthChange}
                tickets={tickets}
              />
            </Box>
          </Box>
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
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={getTicketsForColumn(column.id)}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onTaskClick={handleTicketClick}
                onAddTask={() => setOpenDialog(true)}
                userProfile={userProfile}
                clients={clients}
                users={users}
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
            <LeadsTable
              tickets={getFilteredTickets()}
              onTicketClick={handleTicketClick}
              onDeleteTicket={handleDeleteTicket}
              onUpdateStatus={handleUpdateStatus}
              userProfile={userProfile}
            />
          </Box>
        )}

        {/* Floating Action Button */}
        {(userProfile?.role === 'Manager' || userProfile?.role === 'CEO') && (
          <Fab
            onClick={() => setOpenDialog(true)}
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
        )}

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

        {/* Modals */}
        <AddTaskModal
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          newTask={newTicket}
          setNewTask={setNewTicket}
          onAddTask={handleAddTicket}
        />

        {selectedTicket && (
          <TaskDetailModal
            open={openTaskDetail}
            task={selectedTicket}
            onClose={() => setOpenTaskDetail(false)}
            onUpdate={handleUpdateTicket}
            onDelete={handleDeleteTicket}
          />
        )}

        {selectedTicket && (
          <PricingModal
            open={openPricingModal}
            onClose={() => {
              setOpenPricingModal(false);
              setSelectedTicket(null);
              setTargetColumn('');
            }}
            onSubmit={handlePricingSubmit}
            task={selectedTicket}
            columnTitle={targetColumn === 'invoiced' ? 'Invoiced' : 'Paid'}
          />
        )}

        {selectedTicket && (
          <HoursInputModal
            open={openHoursModal}
            task={selectedTicket}
            onClose={handleHoursModalClose}
            onComplete={handleHoursComplete}
          />
        )}
      </Box>
    </ThemeProvider>
  );
}

export default KanbanBoard;