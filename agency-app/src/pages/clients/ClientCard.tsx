// src/pages/clients/components/ClientCard.tsx
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Avatar,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { TicketWithSubcollections } from '../../types';
import { Client } from '../../types';

interface ClientCardProps {
  client: Client;
  isCEO: boolean;
  isManager: boolean;
  selectedMonth: string;
  filteredTasks: TicketWithSubcollections[];
  getClientRevenue: (clientName: string) => number;
  onClientClick: (client: Client) => void;
  onMenuClick: (e: React.MouseEvent<HTMLElement>, client: Client) => void;
}

const ClientCard: React.FC<ClientCardProps> = ({
  client,
  isCEO,
  isManager,
  selectedMonth,
  filteredTasks,
  getClientRevenue,
  onClientClick,
  onMenuClick,
}) => {
  // Generate month options for display label
  const getMonthLabel = () => {
    if (selectedMonth === 'current') return 'This Month';
    if (selectedMonth === 'all') return 'All Time';
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  return (
    <Card 
      onClick={() => onClientClick(client)}
      sx={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.08)',
          transform: 'translateY(-4px)',
          borderColor: 'rgba(59, 130, 246, 0.3)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: client.status === 'active' 
            ? 'linear-gradient(90deg, #10b981, #059669)'
            : client.status === 'prospect'
            ? 'linear-gradient(90deg, #3b82f6, #1d4ed8)'
            : 'linear-gradient(90deg, #94a3b8, #64748b)'
        }
      }}
    >
      <CardContent sx={{ p: 4 }}>
        {/* Client Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{
              width: 48,
              height: 48,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              fontSize: '16px',
              fontWeight: 600
            }}>
              {client.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ 
                color: '#1e293b',
                fontWeight: 700,
                mb: 0.5
              }}>
                {client.name}
              </Typography>
              <Chip
                label={client.status}
                size="small"
                sx={{
                  background: client.status === 'active' 
                    ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                    : client.status === 'prospect'
                    ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)'
                    : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                  color: client.status === 'active' 
                    ? '#15803d' 
                    : client.status === 'prospect'
                    ? '#1d4ed8'
                    : '#475569',
                  fontWeight: 600,
                  fontSize: '11px',
                  textTransform: 'capitalize',
                  borderRadius: 2,
                  border: 'none'
                }}
              />
            </Box>
          </Box>
          
          {/* Only show edit button to CEO */}
          {isCEO && (
            <IconButton
              onClick={(e) => onMenuClick(e, client)}
              sx={{
                color: '#94a3b8',
                '&:hover': {
                  color: '#64748b',
                  background: 'rgba(148, 163, 184, 0.1)'
                }
              }}
            >
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>

        {/* Revenue Performance - Only show to CEO */}
        {isCEO && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ 
              color: '#64748b',
              fontWeight: 500,
              mb: 2,
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Revenue Performance ({getMonthLabel()})
            </Typography>
            
            {selectedMonth === 'current' && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Expected
                </Typography>
                <Typography variant="body1" sx={{ 
                  fontWeight: 600,
                  color: '#3b82f6'
                }}>
                  ${(client.monthlyRevenue || 0).toLocaleString()}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Actual
              </Typography>
              <Typography variant="body1" sx={{ 
                fontWeight: 600,
                color: '#10b981'
              }}>
                ${getClientRevenue(client.name).toLocaleString()}
              </Typography>
            </Box>

            {/* Variance Badge - Only show for current month */}
            {selectedMonth === 'current' && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Variance
                </Typography>
                {(() => {
                  const clientActual = getClientRevenue(client.name);
                  const clientVariance = clientActual - (client.monthlyRevenue || 0);
                  
                  return (
                    <Chip
                      icon={clientVariance >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                      label={`${clientVariance >= 0 ? '+' : ''}$${Math.abs(clientVariance).toLocaleString()}`}
                      size="small"
                      sx={{
                        background: clientVariance >= 0 
                          ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                          : 'linear-gradient(135deg, #fee2e2, #fecaca)',
                        color: clientVariance >= 0 ? '#059669' : '#dc2626',
                        fontWeight: 600,
                        fontSize: '11px',
                        borderRadius: 2,
                        '& .MuiChip-icon': {
                          color: clientVariance >= 0 ? '#059669' : '#dc2626',
                          fontSize: 14
                        }
                      }}
                    />
                  );
                })()}
              </Box>
            )}
          </Box>
        )}

        {/* Content Strategy Info - Show to managers */}
        {isManager && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ 
              color: '#64748b',
              fontWeight: 500,
              mb: 2,
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Content Strategy
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Article Ideas
              </Typography>
              <Typography variant="body1" sx={{ 
                fontWeight: 600,
                color: '#3b82f6'
              }}>
                0
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                In Progress
              </Typography>
              <Typography variant="body1" sx={{ 
                fontWeight: 600,
                color: '#f59e0b'
              }}>
                {filteredTasks.filter(task => 
                  task.clientName === client.name && 
                  (task.status === 'in_progress' || task.status === 'internal_review' || task.status === 'client_review')
                ).length}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Completed
              </Typography>
              <Typography variant="body1" sx={{ 
                fontWeight: 600,
                color: '#10b981'
              }}>
                {filteredTasks.filter(task => 
                  task.clientName === client.name && 
                  (task.status === 'done' || task.status === 'paid')
                ).length}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Click to view hint */}
        <Box sx={{ 
          mt: 2,
          textAlign: 'center'
        }}>
          <Typography variant="caption" sx={{
            color: '#3b82f6',
            fontSize: '11px',
            fontWeight: 500,
            opacity: 0.8
          }}>
            Click to view content strategy →
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ClientCard;