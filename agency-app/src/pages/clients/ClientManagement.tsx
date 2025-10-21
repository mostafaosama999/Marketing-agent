// src/pages/clients/ClientManagement.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  ThemeProvider,
  createTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/firestore';

import { useAuth } from '../../contexts/AuthContext';
import { useClient } from '../../hooks/useClients';
import { Client } from '../../types';
import {
  useCurrentMonthRevenue,
  useBulkClientRevenue
} from '../../hooks/useTicketSubcollections';
import AddClientModal from '../../components/forms/AddClientModal';
import EditClientModal from '../../components/forms/EditClientModal';

// Refactored components
import ClientMetricsCards from './ClientMetricsCards';
import ClientCard from './ClientCard';
import ClientStatsTable from './ClientStatsTable';

// Modern theme
const modernTheme = createTheme({
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: '32px',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      fontSize: '20px',
      lineHeight: 1.3,
    },
    h6: {
      fontWeight: 600,
      fontSize: '16px',
    },
    subtitle1: {
      fontWeight: 400,
      fontSize: '15px',
      lineHeight: 1.5,
    },
    body1: {
      fontWeight: 500,
      fontSize: '14px',
    },
    body2: {
      fontWeight: 400,
      fontSize: '13px',
    },
  },
});

const ClientManagement: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { clients, loading, addClient } = useClient();

  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuClient, setMenuClient] = useState<Client | null>(null);

  // Role-based permissions
  const isCEO = userProfile?.role === 'CEO';
  const isManager = userProfile?.role === 'Manager';

  // Use optimized hooks for better performance
  const { tickets: revenueTickets, loading: revenueLoading } = useCurrentMonthRevenue();
  const clientNames = clients.map(client => client.name);
  const { revenues: clientRevenues, loading: clientRevenuesLoading } = useBulkClientRevenue(clientNames);

  // Overall loading state
  const ticketsLoading = revenueLoading || clientRevenuesLoading;


  const handleClientClick = (client: Client) => {
    navigate(`/clients/${client.id}`);
  };

  const handleMenuClick = (e: React.MouseEvent<HTMLElement>, client: Client) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setMenuClient(client);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuClient(null);
  };

  const handleEditClick = () => {
    if (menuClient) {
      setSelectedClient(menuClient);
      setOpenEditModal(true);
    }
    handleMenuClose();
  };

  const handleDeleteClick = async () => {
    if (menuClient && window.confirm(`Are you sure you want to delete ${menuClient.name}?`)) {
      try {
        await deleteDoc(doc(db, 'clients', menuClient.id));
      } catch (error) {
        console.error('Error deleting client:', error);
      }
    }
    handleMenuClose();
  };

  const handleEditSubmit = async (updatedClient: Client) => {
    try {
      const { id, ...clientUpdateData } = updatedClient;
      
      // Clean the compensation data to remove undefined values
      if (clientUpdateData.compensation) {
        const cleanedCompensation: any = {};
        
        Object.keys(clientUpdateData.compensation).forEach(key => {
          const value = (clientUpdateData.compensation as any)[key];
          if (value !== undefined && value !== null && value !== '') {
            cleanedCompensation[key] = value;
          }
        });
        
        if (Object.keys(cleanedCompensation).length > 0) {
          clientUpdateData.compensation = cleanedCompensation;
        } else {
          delete clientUpdateData.compensation;
        }
      }
      
      await updateDoc(doc(db, 'clients', id), clientUpdateData);
      setOpenEditModal(false);
      setSelectedClient(null);
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  // Optimized helper function to get client revenue for current month
  const getClientRevenue = (clientName: string) => {
    return clientRevenues[clientName] || 0;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Typography>Loading clients...</Typography>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={modernTheme}>
      <Box sx={{ 
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        minHeight: '100vh',
        p: 4
      }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          mb: 4 
        }}>
          <Box>
            <Typography variant="h4" sx={{ 
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              mb: 1
            }}>
              Client Management
            </Typography>
            <Typography variant="subtitle1" sx={{ color: '#64748b' }}>
              {isCEO ? 'Track revenue performance and client relationships' : 'Manage client content strategy and relationships'}
            </Typography>
          </Box>
          
          {/* Add Button */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {isCEO && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenAddModal(true)}
                sx={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                    boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                Add Client
              </Button>
            )}
          </Box>
        </Box>

        {/* Metrics Cards */}
        <ClientMetricsCards
          isCEO={isCEO}
          isManager={isManager}
          selectedMonth="current"
          totalExpectedRevenue={clients.reduce((sum, client) => sum + (client.monthlyRevenue || 0), 0)}
          activeClients={clients.filter(client => client.status === 'active')}
          actualRevenue={Object.values(clientRevenues).reduce((sum, revenue) => sum + revenue, 0)}
          completedTasks={revenueTickets.filter(ticket =>
            ['done', 'invoiced', 'paid'].includes(ticket.status)
          ).length}
          revenueChange={0}
          revenueChangePercentage={0}
          tasksChange={0}
          clients={clients}
        />

        {/* Client Cards Grid */}
        <Grid container spacing={3}>
          {clients.map((client) => (
            <Grid key={client.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <ClientCard
                client={client}
                isCEO={isCEO}
                isManager={isManager}
                selectedMonth="current"
                filteredTasks={revenueTickets}
                getClientRevenue={getClientRevenue}
                onClientClick={handleClientClick}
                onMenuClick={handleMenuClick}
              />
            </Grid>
          ))}
        </Grid>

        {/* Empty State */}
        {clients.length === 0 && (
          <Box sx={{ 
            textAlign: 'center', 
            py: 12,
            background: 'rgba(255, 255, 255, 0.6)',
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.5)'
          }}>
            <BusinessIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 3 }} />
            <Typography variant="h6" sx={{ color: '#475569', fontWeight: 600, mb: 1 }}>
              No clients yet
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 4, maxWidth: 400, mx: 'auto' }}>
              {isCEO ? 'Add your first client to start tracking revenue performance and managing relationships' : 'No clients available for content strategy management'}
            </Typography>
            {isCEO && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenAddModal(true)}
                sx={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                }}
              >
                Add Your First Client
              </Button>
            )}
          </Box>
        )}

        {/* Stats Table - only show if there are clients and user is CEO or Manager */}
        {(isCEO || isManager) && clients.length > 0 && (
          <ClientStatsTable
            clients={clients}
            isCEO={isCEO}
            isManager={isManager}
          />
        )}

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={handleEditClick}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Edit Client</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
            <ListItemText>Delete Client</ListItemText>
          </MenuItem>
        </Menu>

        {/* Modals */}
        {isCEO && (
          <>
            <AddClientModal
              open={openAddModal}
              onClose={() => setOpenAddModal(false)}
              onSubmit={addClient}
            />
            <EditClientModal
              open={openEditModal}
              onClose={() => setOpenEditModal(false)}
              onSubmit={handleEditSubmit}
              client={selectedClient}
            />
          </>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default ClientManagement;