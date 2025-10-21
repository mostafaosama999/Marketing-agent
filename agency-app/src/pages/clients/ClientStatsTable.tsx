// src/pages/clients/ClientStatsTable.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as NoChangeIcon,
  Info as InfoIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { Client, TicketWithSubcollections, ClientCompensation } from '../../types';
import { ticketsService } from '../../services/api/tickets';
import { ticketWithSubcollectionsService } from '../../services/api/ticketSubcollections';

interface MonthlyStats {
  month: string;
  monthLabel: string;
  expectedRevenue: number;
  actualRevenue: number;
  completedTasks: number;
  activeClients: number;
  variance: number;
  variancePercentage: number;
  revenueChange: number;
  revenueChangePercentage: number;
  tasksChange: number;
}

interface ClientStatsTableProps {
  clients: Client[];
  isCEO: boolean;
  isManager?: boolean;
}

const ClientStatsTable: React.FC<ClientStatsTableProps> = ({
  clients,
  isCEO,
}) => {
  const [ticketsWithRevenue, setTicketsWithRevenue] = useState<TicketWithSubcollections[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all tickets with financial and timeline data
  useEffect(() => {
    const fetchTicketsWithRevenue = async () => {
      try {
        setLoading(true);

        // Get all invoiced/paid tickets
        const invoicedTickets = await ticketsService.getTicketsByStatus('invoiced');
        const paidTickets = await ticketsService.getTicketsByStatus('paid');
        const allRevenueTicketIds = [...invoicedTickets, ...paidTickets].map(ticket => ticket.id);


        // Get tickets with subcollection data
        const ticketsWithData = await ticketWithSubcollectionsService.getTicketsWithSubcollections(
          allRevenueTicketIds,
          { financials: true, timeline: true }
        );


        // Load financial and timeline data for each ticket

        setTicketsWithRevenue(ticketsWithData);
      } catch (error) {
        console.error('Error fetching tickets with revenue:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTicketsWithRevenue();
  }, []);

  // Helper function to calculate ticket revenue following the hierarchy
  const getTicketRevenue = (ticket: TicketWithSubcollections): number => {
    // Priority 1: Check financials subcollection for actualRevenue
    if (ticket.financials?.actualRevenue && ticket.financials.actualRevenue > 0) {
      return ticket.financials.actualRevenue;
    }

    // Priority 2: Fall back to client compensation rates
    const client = clients.find(c => c.name === ticket.clientName);
    if (client?.compensation && ticket.type) {
      const typeRateMap: { [key: string]: keyof ClientCompensation } = {
        'blog': 'blogRate',
        'tutorial': 'tutorialRate',
        'case-study': 'caseStudyRate',
        'whitepaper': 'whitepaperRate',
        'social-media': 'socialMediaRate',
        'email': 'emailRate',
        'landing-page': 'landingPageRate',
        'other': 'otherRate'
      };

      const rateField = typeRateMap[ticket.type];
      if (rateField && client.compensation[rateField]) {
        return Number(client.compensation[rateField]);
      }
    }

    return 0;
  };

  // Generate last 12 months of data using subcollection data
  const generateMonthlyStats = (): MonthlyStats[] => {
    const now = new Date();
    const stats: MonthlyStats[] = [];


    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthValue = `${monthDate.getFullYear()}-${(monthDate.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthLabel = monthDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      });

      // Filter tickets for this month using timeline data or fallback to updatedAt
      const monthTickets = ticketsWithRevenue.filter(ticket => {
        const timeline = ticket.timeline?.stateHistory;
        let relevantDate: string | null = null;

        // First try to use timeline data
        if (timeline) {
          relevantDate = timeline.paid || timeline.invoiced || null;
          if (relevantDate) {
          }
        }

        // Fallback to updatedAt for tickets without timeline data
        if (!relevantDate && ticket.updatedAt) {
          // Convert Firebase timestamp to date string if needed
          if (ticket.updatedAt.toDate && typeof ticket.updatedAt.toDate === 'function') {
            relevantDate = ticket.updatedAt.toDate().toISOString();
          } else if (ticket.updatedAt instanceof Date) {
            relevantDate = ticket.updatedAt.toISOString();
          } else if (typeof ticket.updatedAt === 'string') {
            relevantDate = ticket.updatedAt;
          }
          if (relevantDate) {
          }
        }

        if (!relevantDate) {
          return false;
        }

        const ticketDate = new Date(relevantDate);
        const inMonth = ticketDate >= monthDate && ticketDate < nextMonthDate;
        if (inMonth) {
        }
        return inMonth;
      });

      // Calculate actual revenue using hierarchy: actualRevenue OR client compensation rates
      const actualRevenue = monthTickets.reduce((sum, ticket) => {
        return sum + getTicketRevenue(ticket);
      }, 0);

      // Count completed tickets (including done status)
      const completedTasks = monthTickets.filter(ticket =>
        ['done', 'invoiced', 'paid'].includes(ticket.status)
      ).length;

      // Expected revenue is always the same (sum of active clients' monthly revenue)
      const expectedRevenue = clients
        .filter(client => client.status === 'active')
        .reduce((sum, client) => sum + (client.monthlyRevenue || 0), 0);

      const activeClientsCount = clients.filter(client => client.status === 'active').length;

      // Calculate variance
      const variance = actualRevenue - expectedRevenue;
      const variancePercentage = expectedRevenue > 0 ? (variance / expectedRevenue) * 100 : 0;


      stats.push({
        month: monthValue,
        monthLabel,
        expectedRevenue,
        actualRevenue,
        completedTasks,
        activeClients: activeClientsCount,
        variance,
        variancePercentage,
        revenueChange: 0, // Will calculate after filtering
        revenueChangePercentage: 0, // Will calculate after filtering
        tasksChange: 0, // Will calculate after filtering
      });
    }
    
    return stats.reverse(); // Show most recent first
  };

  // Calculate changes after filtering
  const calculateChanges = (filteredStats: MonthlyStats[]): MonthlyStats[] => {
    return filteredStats.map((stat, index) => {
      if (index === filteredStats.length - 1) {
        // This is the oldest month in our filtered data, no previous data
        return stat;
      }
      
      const nextStat = filteredStats[index + 1]; // Next in array is previous in time
      const revenueChange = stat.actualRevenue - nextStat.actualRevenue;
      const revenueChangePercentage = nextStat.actualRevenue > 0 ? (revenueChange / nextStat.actualRevenue) * 100 : 0;
      const tasksChange = stat.completedTasks - nextStat.completedTasks;
      
      return {
        ...stat,
        revenueChange,
        revenueChangePercentage,
        tasksChange,
      };
    });
  };

  const allMonthlyStats = generateMonthlyStats();

  // Calculate current month in YYYY-MM format
  const now = new Date();
  const currentMonthValue = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  // Filter to show months with actual data OR the current month
  const filteredStats = allMonthlyStats.filter(stat =>
    stat.actualRevenue > 0 || stat.completedTasks > 0 || stat.month === currentMonthValue
  );
  
  // Calculate month-over-month changes for filtered data
  const monthlyStats = calculateChanges(filteredStats);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  };

  const getVarianceColor = (percentage: number) => {
    if (Math.abs(percentage) < 5) return '#64748b'; // neutral
    return percentage >= 0 ? '#059669' : '#dc2626'; // green/red
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return <TrendingUpIcon sx={{ fontSize: 16 }} />;
    if (value < 0) return <TrendingDownIcon sx={{ fontSize: 16 }} />;
    return <NoChangeIcon sx={{ fontSize: 16 }} />;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return '#059669';
    if (value < 0) return '#dc2626';
    return '#64748b';
  };

  if (!isCEO) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
       
      </Box>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading monthly statistics...
        </Typography>
      </Box>
    );
  }

  // Don't render if no data to show
  if (monthlyStats.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 6, mb: 4 }}>
      {/* Modern Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 3 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)'
          }}>
            <AssessmentIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ 
              fontWeight: 700, 
              color: '#1e293b',
              fontSize: '20px',
              lineHeight: 1.2,
              mb: 0.5
            }}>
              Monthly Performance
            </Typography>
            <Typography variant="body2" sx={{ 
              color: '#64748b',
              fontSize: '13px'
            }}>
              Historical trends and variance analysis
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Shows current month and months with revenue or completed tasks" arrow placement="left">
          <IconButton 
            size="small" 
            sx={{ 
              backgroundColor: 'rgba(100, 116, 139, 0.08)',
              '&:hover': { backgroundColor: 'rgba(100, 116, 139, 0.12)' }
            }}
          >
            <InfoIcon sx={{ fontSize: 18, color: '#64748b' }} />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Modern Table Container */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(226, 232, 240, 0.6)',
        }}
      >
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow sx={{ 
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderBottom: '2px solid #e2e8f0'
            }}>
              <TableCell sx={{ 
                fontWeight: 700, 
                color: '#334155', 
                fontSize: '13px', 
                py: 2.5,
                px: 3,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: 'none',
                width: '15%'
              }}>
                Month
              </TableCell>
              <TableCell align="right" sx={{ 
                fontWeight: 700, 
                color: '#334155', 
                fontSize: '13px', 
                py: 2.5,
                px: 2,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: 'none',
                width: '15%'
              }}>
                Expected
              </TableCell>
              <TableCell align="right" sx={{ 
                fontWeight: 700, 
                color: '#334155', 
                fontSize: '13px', 
                py: 2.5,
                px: 2,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: 'none',
                width: '15%'
              }}>
                Actual
              </TableCell>
              <TableCell align="center" sx={{ 
                fontWeight: 700, 
                color: '#334155', 
                fontSize: '13px', 
                py: 2.5,
                px: 2,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: 'none',
                width: '12%'
              }}>
                Variance
              </TableCell>
              <TableCell align="center" sx={{ 
                fontWeight: 700, 
                color: '#334155', 
                fontSize: '13px', 
                py: 2.5,
                px: 2,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: 'none',
                width: '13%'
              }}>
                Growth
              </TableCell>
              <TableCell align="center" sx={{ 
                fontWeight: 700, 
                color: '#334155', 
                fontSize: '13px', 
                py: 2.5,
                px: 2,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: 'none',
                width: '10%'
              }}>
                Tasks
              </TableCell>
              <TableCell align="center" sx={{ 
                fontWeight: 700, 
                color: '#334155', 
                fontSize: '13px', 
                py: 2.5,
                px: 2,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: 'none',
                width: '12%'
              }}>
                Change
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {monthlyStats.map((stat, index) => {
              // Calculate current month in YYYY-MM format
              const now = new Date();
              const currentMonthValue = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
              const isCurrentMonth = stat.month === currentMonthValue;
              const hasChangeData = index < monthlyStats.length - 1; // All except the oldest month should have change data
              
              return (
                <TableRow 
                  key={stat.month}
                  sx={{ 
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: isCurrentMonth ? 'rgba(102, 126, 234, 0.04)' : 'rgba(255, 255, 255, 0.8)',
                    borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: isCurrentMonth ? 'rgba(102, 126, 234, 0.08)' : 'rgba(248, 250, 252, 0.9)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    },
                    '&:last-child': {
                      borderBottom: 'none'
                    }
                  }}
                >
                  <TableCell sx={{ py: 2.5, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body1" sx={{ 
                        fontWeight: isCurrentMonth ? 700 : 600,
                        color: isCurrentMonth ? '#667eea' : '#334155',
                        fontSize: '14px',
                        letterSpacing: '-0.01em'
                      }}>
                        {stat.monthLabel}
                      </Typography>
                      {isCurrentMonth && (
                        <Box sx={{
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          color: 'white',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
                        }}>
                          Current
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  
                  <TableCell align="right" sx={{ py: 2.5, px: 2 }}>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 500,
                      color: '#64748b',
                      fontSize: '13px',
                      fontFamily: 'ui-monospace, SFMono-Regular, monospace'
                    }}>
                      {formatCurrency(stat.expectedRevenue)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="right" sx={{ py: 2.5, px: 2 }}>
                    <Typography variant="body1" sx={{ 
                      fontWeight: 700,
                      color: '#1e293b',
                      fontSize: '15px',
                      fontFamily: 'ui-monospace, SFMono-Regular, monospace'
                    }}>
                      {formatCurrency(stat.actualRevenue)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="center" sx={{ py: 2.5, px: 2 }}>
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Box sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 2,
                        py: 1,
                        borderRadius: '8px',
                        backgroundColor: Math.abs(stat.variancePercentage) < 5 ? 
                          'rgba(100, 116, 139, 0.1)' : 
                          stat.variancePercentage >= 0 ? 
                          'rgba(5, 150, 105, 0.1)' : 
                          'rgba(220, 38, 38, 0.1)',
                      }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: getVarianceColor(stat.variancePercentage),
                            fontWeight: 700,
                            fontSize: '13px',
                            fontFamily: 'ui-monospace, SFMono-Regular, monospace'
                          }}
                        >
                          {formatPercentage(stat.variancePercentage)}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  
                  <TableCell align="center" sx={{ py: 2.5, px: 2 }}>
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {hasChangeData && (stat.revenueChange !== 0 || stat.revenueChangePercentage !== 0) ? (
                        <Box sx={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 1,
                          px: 1.5,
                          py: 0.75,
                          borderRadius: '8px',
                          backgroundColor: stat.revenueChange >= 0 ? 
                            'rgba(5, 150, 105, 0.1)' : 
                            'rgba(220, 38, 38, 0.1)'
                        }}>
                          <Box sx={{ 
                            color: getChangeColor(stat.revenueChange),
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {getChangeIcon(stat.revenueChange)}
                          </Box>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: getChangeColor(stat.revenueChange),
                              fontWeight: 700,
                              fontSize: '12px',
                              fontFamily: 'ui-monospace, SFMono-Regular, monospace'
                            }}
                          >
                            {formatPercentage(stat.revenueChangePercentage)}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '11px' }}>
                          —
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  
                  <TableCell align="center" sx={{ py: 2.5, px: 2 }}>
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Box sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                      }}>
                        <Typography variant="body1" sx={{ 
                          fontWeight: 700,
                          color: '#3b82f6',
                          fontSize: '14px'
                        }}>
                          {stat.completedTasks}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  
                  <TableCell align="center" sx={{ py: 2.5, px: 2 }}>
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {hasChangeData && stat.tasksChange !== 0 ? (
                        <Box sx={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 1,
                          px: 1.5,
                          py: 0.75,
                          borderRadius: '8px',
                          backgroundColor: stat.tasksChange >= 0 ? 
                            'rgba(5, 150, 105, 0.1)' : 
                            'rgba(220, 38, 38, 0.1)'
                        }}>
                          <Box sx={{ 
                            color: getChangeColor(stat.tasksChange),
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {getChangeIcon(stat.tasksChange)}
                          </Box>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: getChangeColor(stat.tasksChange),
                              fontWeight: 700,
                              fontSize: '12px'
                            }}
                          >
                            {stat.tasksChange >= 0 ? '+' : ''}{stat.tasksChange}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '11px' }}>
                          —
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Modern Summary Section */}
      <Box sx={{ 
        mt: 3, 
        p: 3, 
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(102, 126, 234, 0.1)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <InfoIcon sx={{ color: '#667eea', fontSize: 16 }} />
          <Typography variant="subtitle2" sx={{ 
            color: '#334155',
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Performance Insights
          </Typography>
        </Box>
        <Typography variant="body2" sx={{
          color: '#64748b',
          fontSize: '12px',
          lineHeight: 1.6,
          fontWeight: 500
        }}>
          This table displays the current month (always shown) and months with active revenue or completed tasks.
          <strong> Variance </strong> indicates performance vs. expectations, while <strong> Growth </strong> shows
          month-over-month changes. The current month is highlighted with a purple accent.
        </Typography>
      </Box>
    </Box>
  );
};

export default ClientStatsTable;