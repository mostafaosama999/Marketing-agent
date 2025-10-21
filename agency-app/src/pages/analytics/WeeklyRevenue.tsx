// src/pages/analytics/WeeklyRevenue.tsx
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  ThemeProvider,
  createTheme,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { TrendingUp as TrendingUpIcon, CalendarToday, DateRange } from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { useClient } from '../../hooks/useClients';
import { ticketsService } from '../../services/api/tickets';
import { ticketFinancialsService } from '../../services/api/ticketSubcollections';
import { Ticket, TicketFinancials } from '../../types';
import MonthFilter from '../../components/features/kanban/MonthFilter';

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
    body2: {
      fontWeight: 400,
      fontSize: '13px',
    },
  },
});

interface TicketWithFinancials extends Ticket {
  financials?: TicketFinancials | null;
}

const WeeklyRevenue: React.FC = () => {
  const { userProfile } = useAuth();
  const { clients } = useClient();
  const [allTickets, setAllTickets] = React.useState<TicketWithFinancials[]>([]);
  const [allTicketsLoading, setAllTicketsLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<'daily' | 'weekly'>('weekly');
  const [selectedMonth, setSelectedMonth] = React.useState<string>('');
  const [focusedSeries, setFocusedSeries] = React.useState<string | null>(null);

  // Role-based permissions
  const isCEO = userProfile?.role === 'CEO';

  // Handle legend item clicks to focus/isolate a series
  const handleLegendClick = (event: React.MouseEvent, legendItem: any, index: number) => {
    event.preventDefault();
    console.log('Legend clicked:', legendItem, index);

    // Try to get the series ID from the legend item
    const seriesId = legendItem?.id || legendItem?.label;

    if (!seriesId) {
      console.warn('No series ID found in legend item');
      return;
    }

    setFocusedSeries(prev => {
      if (prev === seriesId) {
        // Clicking the same series again -> show all
        return null;
      } else {
        // Clicking a different series -> focus on it (hide all others)
        return seriesId;
      }
    });
  };

  // Fetch all tickets and their financials
  React.useEffect(() => {
    const unsubscribe = ticketsService.subscribeToTickets(async (tickets) => {
      setAllTicketsLoading(true);
      try {
        // Fetch financials for all tickets in parallel
        const ticketsWithFinancials = await Promise.all(
          tickets.map(async (ticket) => {
            try {
              const financials = await ticketFinancialsService.getFinancials(ticket.id);
              return { ...ticket, financials };
            } catch (error) {
              return { ...ticket, financials: null };
            }
          })
        );
        setAllTickets(ticketsWithFinancials);
      } catch (error) {
        console.error('Error fetching financials:', error);
        setAllTickets(tickets.map(t => ({ ...t, financials: null })));
      } finally {
        setAllTicketsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Helper function to safely convert dates
  const safeToDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  };

  // Calculate revenue for a ticket following the correct hierarchy from FINANCIAL_DATA_MODEL.md
  const getTicketRevenue = (ticket: TicketWithFinancials, clientName: string) => {
    let revenue = 0;

    // Priority 1: Check financials subcollection for actualRevenue
    if (ticket.financials?.actualRevenue && ticket.financials.actualRevenue > 0) {
      return ticket.financials.actualRevenue;
    }

    // Priority 2: Fall back to client compensation rates
    const client = clients.find(c => c.name === clientName);
    if (client?.compensation && ticket.type) {
      const typeRateMap: { [key: string]: keyof typeof client.compensation } = {
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
        revenue = Number(client.compensation[rateField]);
      }
    }

    return revenue;
  };

  // Helper function to get ISO week string (for grouping)
  const getISOWeek = (date: Date): string => {
    const target = new Date(date.valueOf());
    const dayNumber = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);
    const firstThursdayOfYear = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    const week = 1 + Math.ceil((firstThursdayOfYear - target.valueOf()) / 604800000);
    return `${target.getFullYear()}-W${week.toString().padStart(2, '0')}`;
  };

  // Helper function to get readable week label from ISO week
  const getReadableWeekLabel = (isoWeek: string): string => {
    // Parse ISO week format: "2025-W36"
    const [year, weekNum] = isoWeek.split('-W');

    // Get the date of the Monday of that week
    const jan4 = new Date(parseInt(year), 0, 4);
    const monday = new Date(jan4);
    const dayOffset = (parseInt(weekNum) - 1) * 7;
    const weekDay = (jan4.getDay() + 6) % 7;
    monday.setDate(jan4.getDate() - weekDay + dayOffset);

    // Format as "Week of Sep 2"
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[monday.getMonth()];
    const day = monday.getDate();

    return `${month} ${day}`;
  };

  // Helper function to get date string for daily grouping
  const getDateString = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  // Helper function to format date for display
  const formatDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    return `${month} ${day}`;
  };

  // Helper function to generate all dates in the last N days
  const generateDateRange = (days: number): string[] => {
    const dates: string[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(getDateString(date));
    }

    return dates;
  };

  // Helper function to generate dates for display - uses month filter if selected, otherwise all historical data
  const generateDateRangeForDisplay = (tickets: TicketWithFinancials[]): string[] => {
    if (selectedMonth) {
      // If month filter is selected, generate all dates in that month
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1); // First day of month
      const endDate = new Date(year, month, 0); // Last day of month

      const dates: string[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        dates.push(getDateString(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return dates;
    } else {
      // No filter: show ALL historical data from earliest ticket to today
      if (tickets.length === 0) {
        return generateDateRange(30); // Fallback if no data
      }

      // Find earliest ticket date
      const ticketDates = tickets
        .map(t => safeToDate(t.updatedAt))
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime());

      if (ticketDates.length === 0) {
        return generateDateRange(30); // Fallback if no valid dates
      }

      const earliestDate = ticketDates[0];
      const today = new Date();

      // Generate all dates from earliest to today
      const dates: string[] = [];
      const currentDate = new Date(earliestDate);

      while (currentDate <= today) {
        dates.push(getDateString(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return dates;
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
    const updatedDate = safeToDate(ticket.updatedAt);
    if (updatedDate) {
      return updatedDate;
    }

    return null;
  };

  // Get completed tickets (reusable filter)
  const getCompletedTickets = () => {
    let filteredTickets = allTickets.filter(ticket =>
      (ticket.status === 'done' || ticket.status === 'paid' || ticket.status === 'invoiced') &&
      ticket.updatedAt &&
      ticket.clientName &&
      clients.some(c => c.name === ticket.clientName)
    );

    // Apply month filter if selected
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

  // Get Weekly Revenue Data by Client
  const getWeeklyRevenueByClient = () => {
    const completedTicketsWithRevenue = getCompletedTickets();

    // Aggregate revenue by week and client
    const weeklyData: { [week: string]: { [client: string]: number } } = {};
    const clientSet = new Set<string>();

    completedTicketsWithRevenue.forEach(ticket => {
      const completedAt = safeToDate(ticket.updatedAt);
      if (!completedAt || !ticket.clientName) return;

      const week = getISOWeek(completedAt);
      const client = ticket.clientName;
      const revenue = getTicketRevenue(ticket, client);

      if (revenue > 0) {
        if (!weeklyData[week]) {
          weeklyData[week] = {};
        }
        if (!weeklyData[week][client]) {
          weeklyData[week][client] = 0;
        }
        weeklyData[week][client] += revenue;
        clientSet.add(client);
      }
    });

    // Convert to array format for chart
    const weeks = Object.keys(weeklyData).sort();
    const clientsArray = Array.from(clientSet).sort((a, b) => {
      // Sort clients by total revenue (highest first)
      const totalA = completedTicketsWithRevenue
        .filter(t => t.clientName === a)
        .reduce((sum, t) => sum + getTicketRevenue(t, a), 0);
      const totalB = completedTicketsWithRevenue
        .filter(t => t.clientName === b)
        .reduce((sum, t) => sum + getTicketRevenue(t, b), 0);
      return totalB - totalA;
    });

    // Get last 12 weeks for better readability
    const recentWeeks = weeks.slice(-12);

    return {
      weeks: recentWeeks,
      clients: clientsArray,
      data: recentWeeks.map(week => {
        const weekData: { [key: string]: any } = { week: getReadableWeekLabel(week) };
        clientsArray.forEach(client => {
          weekData[client] = weeklyData[week]?.[client] || 0;
        });
        return weekData;
      })
    };
  };

  // Get Weekly Profit Data by Client (Revenue - Cost)
  const getWeeklyProfitByClient = () => {
    const completedTicketsWithRevenue = getCompletedTickets();

    // Aggregate profit by week and client
    const weeklyData: { [week: string]: { [client: string]: number } } = {};
    const clientSet = new Set<string>();

    completedTicketsWithRevenue.forEach(ticket => {
      const completedAt = safeToDate(ticket.updatedAt);
      if (!completedAt || !ticket.clientName) return;

      const week = getISOWeek(completedAt);
      const client = ticket.clientName;
      const revenue = getTicketRevenue(ticket, client);
      const cost = ticket.financials?.totalCost || 0;
      const profit = revenue - cost;

      if (revenue > 0) { // Only include tickets with revenue
        if (!weeklyData[week]) {
          weeklyData[week] = {};
        }
        if (!weeklyData[week][client]) {
          weeklyData[week][client] = 0;
        }
        weeklyData[week][client] += profit;
        clientSet.add(client);
      }
    });

    // Convert to array format for chart
    const weeks = Object.keys(weeklyData).sort();
    const clientsArray = Array.from(clientSet).sort((a, b) => {
      // Sort clients by total profit (highest first)
      const totalA = completedTicketsWithRevenue
        .filter(t => t.clientName === a)
        .reduce((sum, t) => {
          const revenue = getTicketRevenue(t, a);
          const cost = t.financials?.totalCost || 0;
          return sum + (revenue - cost);
        }, 0);
      const totalB = completedTicketsWithRevenue
        .filter(t => t.clientName === b)
        .reduce((sum, t) => {
          const revenue = getTicketRevenue(t, b);
          const cost = t.financials?.totalCost || 0;
          return sum + (revenue - cost);
        }, 0);
      return totalB - totalA;
    });

    // Get last 12 weeks for better readability
    const recentWeeks = weeks.slice(-12);

    return {
      weeks: recentWeeks,
      clients: clientsArray,
      data: recentWeeks.map(week => {
        const weekData: { [key: string]: any } = { week: getReadableWeekLabel(week) };
        clientsArray.forEach(client => {
          weekData[client] = weeklyData[week]?.[client] || 0;
        });
        return weekData;
      })
    };
  };

  // Get Weekly Completed Tickets Count by Client
  const getWeeklyCompletedTicketsByClient = () => {
    const completedTickets = getCompletedTickets();

    // Aggregate ticket count by week and client
    const weeklyData: { [week: string]: { [client: string]: number } } = {};
    const clientSet = new Set<string>();

    completedTickets.forEach(ticket => {
      const completedAt = safeToDate(ticket.updatedAt);
      if (!completedAt || !ticket.clientName) return;

      const week = getISOWeek(completedAt);
      const client = ticket.clientName;

      if (!weeklyData[week]) {
        weeklyData[week] = {};
      }
      if (!weeklyData[week][client]) {
        weeklyData[week][client] = 0;
      }
      weeklyData[week][client] += 1;
      clientSet.add(client);
    });

    // Convert to array format for chart
    const weeks = Object.keys(weeklyData).sort();
    const clientsArray = Array.from(clientSet).sort((a, b) => {
      // Sort clients by total tickets completed (highest first)
      const totalA = completedTickets.filter(t => t.clientName === a).length;
      const totalB = completedTickets.filter(t => t.clientName === b).length;
      return totalB - totalA;
    });

    // Get last 12 weeks for better readability
    const recentWeeks = weeks.slice(-12);

    return {
      weeks: recentWeeks,
      clients: clientsArray,
      data: recentWeeks.map(week => {
        const weekData: { [key: string]: any } = { week: getReadableWeekLabel(week) };
        clientsArray.forEach(client => {
          weekData[client] = weeklyData[week]?.[client] || 0;
        });
        return weekData;
      })
    };
  };

  // Get Weekly Completed Tickets Count by Writer/Manager
  const getWeeklyCompletedTicketsByPerson = () => {
    const completedTickets = getCompletedTickets();

    // Aggregate ticket count by week and person (assignedTo)
    const weeklyData: { [week: string]: { [person: string]: number } } = {};
    const personSet = new Set<string>();

    completedTickets.forEach(ticket => {
      const completedAt = safeToDate(ticket.updatedAt);
      if (!completedAt || !ticket.assignedTo) return;

      const week = getISOWeek(completedAt);
      const person = ticket.assignedTo;

      if (!weeklyData[week]) {
        weeklyData[week] = {};
      }
      if (!weeklyData[week][person]) {
        weeklyData[week][person] = 0;
      }
      weeklyData[week][person] += 1;
      personSet.add(person);
    });

    // Convert to array format for chart
    const weeks = Object.keys(weeklyData).sort();
    const personsArray = Array.from(personSet).sort((a, b) => {
      // Sort by total tickets completed (highest first)
      const totalA = completedTickets.filter(t => t.assignedTo === a).length;
      const totalB = completedTickets.filter(t => t.assignedTo === b).length;
      return totalB - totalA;
    });

    // Get last 12 weeks for better readability
    const recentWeeks = weeks.slice(-12);

    return {
      weeks: recentWeeks,
      persons: personsArray,
      data: recentWeeks.map(week => {
        const weekData: { [key: string]: any } = { week: getReadableWeekLabel(week) };
        personsArray.forEach(person => {
          weekData[person] = weeklyData[week]?.[person] || 0;
        });
        return weekData;
      })
    };
  };

  // Get Daily Revenue Data by Client
  const getDailyRevenueByClient = () => {
    const completedTicketsWithRevenue = getCompletedTickets();

    // Aggregate revenue by date and client
    const dailyData: { [date: string]: { [client: string]: number } } = {};
    const clientSet = new Set<string>();

    completedTicketsWithRevenue.forEach(ticket => {
      const completedAt = safeToDate(ticket.updatedAt);
      if (!completedAt || !ticket.clientName) return;

      const dateStr = getDateString(completedAt);
      const client = ticket.clientName;
      const revenue = getTicketRevenue(ticket, client);

      if (revenue > 0) {
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = {};
        }
        if (!dailyData[dateStr][client]) {
          dailyData[dateStr][client] = 0;
        }
        dailyData[dateStr][client] += revenue;
        clientSet.add(client);
      }
    });

    // Get all clients sorted by total revenue
    const clientsArray = Array.from(clientSet).sort((a, b) => {
      const totalA = completedTicketsWithRevenue
        .filter(t => t.clientName === a)
        .reduce((sum, t) => sum + getTicketRevenue(t, a), 0);
      const totalB = completedTicketsWithRevenue
        .filter(t => t.clientName === b)
        .reduce((sum, t) => sum + getTicketRevenue(t, b), 0);
      return totalB - totalA;
    });

    // Generate complete date range (month filter or all historical data)
    const allDates = generateDateRangeForDisplay(completedTicketsWithRevenue);

    return {
      dates: allDates,
      clients: clientsArray,
      data: allDates.map(date => {
        const dateData: { [key: string]: any } = { date: formatDateLabel(date) };
        clientsArray.forEach(client => {
          dateData[client] = dailyData[date]?.[client] || 0;
        });
        return dateData;
      })
    };
  };

  // Get Daily Profit Data by Client (Revenue - Cost)
  const getDailyProfitByClient = () => {
    const completedTicketsWithRevenue = getCompletedTickets();

    // Aggregate profit by date and client
    const dailyData: { [date: string]: { [client: string]: number } } = {};
    const clientSet = new Set<string>();

    completedTicketsWithRevenue.forEach(ticket => {
      const completedAt = safeToDate(ticket.updatedAt);
      if (!completedAt || !ticket.clientName) return;

      const dateStr = getDateString(completedAt);
      const client = ticket.clientName;
      const revenue = getTicketRevenue(ticket, client);
      const cost = ticket.financials?.totalCost || 0;
      const profit = revenue - cost;

      if (revenue > 0) { // Only include tickets with revenue
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = {};
        }
        if (!dailyData[dateStr][client]) {
          dailyData[dateStr][client] = 0;
        }
        dailyData[dateStr][client] += profit;
        clientSet.add(client);
      }
    });

    // Get all clients sorted by total profit
    const clientsArray = Array.from(clientSet).sort((a, b) => {
      const totalA = completedTicketsWithRevenue
        .filter(t => t.clientName === a)
        .reduce((sum, t) => {
          const revenue = getTicketRevenue(t, a);
          const cost = t.financials?.totalCost || 0;
          return sum + (revenue - cost);
        }, 0);
      const totalB = completedTicketsWithRevenue
        .filter(t => t.clientName === b)
        .reduce((sum, t) => {
          const revenue = getTicketRevenue(t, b);
          const cost = t.financials?.totalCost || 0;
          return sum + (revenue - cost);
        }, 0);
      return totalB - totalA;
    });

    // Generate complete date range (month filter or all historical data)
    const allDates = generateDateRangeForDisplay(completedTicketsWithRevenue);

    return {
      dates: allDates,
      clients: clientsArray,
      data: allDates.map(date => {
        const dateData: { [key: string]: any } = { date: formatDateLabel(date) };
        clientsArray.forEach(client => {
          dateData[client] = dailyData[date]?.[client] || 0;
        });
        return dateData;
      })
    };
  };

  // Get Daily Completed Tickets Count by Client
  const getDailyCompletedTicketsByClient = () => {
    const completedTickets = getCompletedTickets();

    // Aggregate ticket count by date and client
    const dailyData: { [date: string]: { [client: string]: number } } = {};
    const clientSet = new Set<string>();

    completedTickets.forEach(ticket => {
      const completedAt = safeToDate(ticket.updatedAt);
      if (!completedAt || !ticket.clientName) return;

      const dateStr = getDateString(completedAt);
      const client = ticket.clientName;

      if (!dailyData[dateStr]) {
        dailyData[dateStr] = {};
      }
      if (!dailyData[dateStr][client]) {
        dailyData[dateStr][client] = 0;
      }
      dailyData[dateStr][client] += 1;
      clientSet.add(client);
    });

    // Get all clients sorted by total tickets completed
    const clientsArray = Array.from(clientSet).sort((a, b) => {
      const totalA = completedTickets.filter(t => t.clientName === a).length;
      const totalB = completedTickets.filter(t => t.clientName === b).length;
      return totalB - totalA;
    });

    // Generate complete date range (month filter or all historical data)
    const allDates = generateDateRangeForDisplay(completedTickets);

    return {
      dates: allDates,
      clients: clientsArray,
      data: allDates.map(date => {
        const dateData: { [key: string]: any } = { date: formatDateLabel(date) };
        clientsArray.forEach(client => {
          dateData[client] = dailyData[date]?.[client] || 0;
        });
        return dateData;
      })
    };
  };

  // Get Daily Completed Tickets Count by Writer/Manager
  const getDailyCompletedTicketsByPerson = () => {
    const completedTickets = getCompletedTickets();

    // Aggregate ticket count by date and person (assignedTo)
    const dailyData: { [date: string]: { [person: string]: number } } = {};
    const personSet = new Set<string>();

    completedTickets.forEach(ticket => {
      const completedAt = safeToDate(ticket.updatedAt);
      if (!completedAt || !ticket.assignedTo) return;

      const dateStr = getDateString(completedAt);
      const person = ticket.assignedTo;

      if (!dailyData[dateStr]) {
        dailyData[dateStr] = {};
      }
      if (!dailyData[dateStr][person]) {
        dailyData[dateStr][person] = 0;
      }
      dailyData[dateStr][person] += 1;
      personSet.add(person);
    });

    // Get all persons sorted by total tickets completed
    const personsArray = Array.from(personSet).sort((a, b) => {
      const totalA = completedTickets.filter(t => t.assignedTo === a).length;
      const totalB = completedTickets.filter(t => t.assignedTo === b).length;
      return totalB - totalA;
    });

    // Generate complete date range (month filter or all historical data)
    const allDates = generateDateRangeForDisplay(completedTickets);

    return {
      dates: allDates,
      persons: personsArray,
      data: allDates.map(date => {
        const dateData: { [key: string]: any } = { date: formatDateLabel(date) };
        personsArray.forEach(person => {
          dateData[person] = dailyData[date]?.[person] || 0;
        });
        return dateData;
      })
    };
  };

  // Generate distinct colors for clients
  const getClientColors = (clients: string[]) => {
    const colors = [
      '#1f77b4', // blue
      '#ff7f0e', // orange
      '#2ca02c', // green
      '#d62728', // red
      '#9467bd', // purple
      '#8c564b', // brown
      '#e377c2', // pink
      '#7f7f7f', // gray
      '#bcbd22', // olive
      '#17becf', // cyan
    ];

    return clients.map((_, index) => colors[index % colors.length]);
  };

  // Get chart data based on view mode
  const revenueData = viewMode === 'daily' ? getDailyRevenueByClient() : getWeeklyRevenueByClient();
  const profitData = viewMode === 'daily' ? getDailyProfitByClient() : getWeeklyProfitByClient();
  const ticketCountData = viewMode === 'daily' ? getDailyCompletedTicketsByClient() : getWeeklyCompletedTicketsByClient();
  const ticketsByPersonData = viewMode === 'daily' ? getDailyCompletedTicketsByPerson() : getWeeklyCompletedTicketsByPerson();

  // Get the label key based on view mode
  const labelKey = viewMode === 'daily' ? 'date' : 'week';
  const timeLabel = viewMode === 'daily' ? 'Date' : 'Week';

  // Dynamic period label based on month filter
  const getPeriodLabel = () => {
    if (viewMode === 'weekly') {
      return 'Last 12 weeks';
    }

    if (selectedMonth) {
      // Parse selected month and format it nicely
      const [year, month] = selectedMonth.split('-');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }

    return 'All Historical Data';
  };

  const periodLabel = getPeriodLabel();

  // Check permissions
  const isManager = userProfile?.role === 'Manager';

  // Month filter handler
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
  };

  return (
    <ThemeProvider theme={modernTheme}>
      <Box sx={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        minHeight: '100vh',
        p: 4
      }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: '#3b82f6' }} />
              <Box>
                <Typography variant="h4" sx={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}>
                  Revenue Analytics
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Track revenue and performance trends across all clients
                </Typography>
              </Box>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {/* Month Filter */}
              <MonthFilter
                selectedMonth={selectedMonth}
                onMonthChange={handleMonthChange}
                tickets={allTickets}
              />

              {/* View Mode Toggle */}
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, newMode) => newMode && setViewMode(newMode)}
                aria-label="view mode"
                sx={{
                  backgroundColor: 'white',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    fontSize: '14px',
                    fontWeight: 600,
                    textTransform: 'none',
                    color: '#64748b',
                    '&.Mui-selected': {
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#2563eb',
                      }
                    },
                    '&:hover': {
                      backgroundColor: '#f1f5f9',
                    }
                  }
                }}
              >
                <ToggleButton value="weekly">
                  <DateRange sx={{ mr: 1, fontSize: 20 }} />
                  Weekly
                </ToggleButton>
                <ToggleButton value="daily">
                  <CalendarToday sx={{ mr: 1, fontSize: 20 }} />
                  Daily
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Box>

        {/* Revenue Chart */}
        {isCEO && revenueData.clients.length > 0 && revenueData.data.length > 0 ? (
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{
                fontWeight: 700,
                mb: 1,
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}>
                {viewMode === 'daily' ? 'Daily' : 'Weekly'} Revenue Trend by Client
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                {periodLabel} of completed task revenue ({revenueData.clients.join(', ')})
              </Typography>

              <Box sx={{
                width: '100%',
                height: { xs: 350, sm: 400, md: 450 },
                position: 'relative'
              }}>
                {allTicketsLoading ? (
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    flexDirection: 'column',
                    gap: 2
                  }}>
                    <CircularProgress size={40} sx={{ color: '#3b82f6' }} />
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Loading revenue data...
                    </Typography>
                  </Box>
                ) : (
                  <LineChart
                    dataset={revenueData.data}
                    xAxis={[{
                      dataKey: labelKey,
                      scaleType: 'point',
                      label: timeLabel,
                    }]}
                    yAxis={[{
                      label: 'Revenue ($)',
                      valueFormatter: (value: number) => `$${value.toLocaleString()}`,
                    }]}
                    series={revenueData.clients
                      .filter(client => focusedSeries === null || client === focusedSeries)
                      .map((client) => {
                        const originalIndex = revenueData.clients.indexOf(client);
                        return {
                          id: client,
                          dataKey: client,
                          label: client,
                          color: getClientColors(revenueData.clients)[originalIndex],
                          curve: 'linear',
                          connectNulls: false,
                        };
                      })}
                    slotProps={{
                      legend: {
                        position: { vertical: 'top', horizontal: 'center' },
                        onItemClick: handleLegendClick,
                      },
                    }}
                    sx={{
                      '& .MuiChartsLegend-series': {
                        cursor: 'pointer !important',
                        userSelect: 'none',
                        '&:hover': {
                          opacity: 0.7,
                        },
                      },
                    }}
                    margin={{ left: 80, right: 20, top: 80, bottom: 50 }}
                    grid={{ vertical: true, horizontal: true }}
                  />
                )}
              </Box>

              {revenueData.data.length === 0 && !allTicketsLoading && (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
                    No revenue data available for the {periodLabel.toLowerCase()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>
                    Complete some tasks to see revenue trends
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ) : !isCEO && !isManager ? (
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            p: 6,
            textAlign: 'center'
          }}>
            <Typography variant="h5" sx={{ color: '#64748b', fontWeight: 600 }}>
              Access Restricted
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mt: 2 }}>
              This page is only accessible to CEO and Manager users
            </Typography>
          </Card>
        ) : isCEO ? (
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            p: 6,
            textAlign: 'center'
          }}>
            <Typography variant="h5" sx={{ color: '#64748b', fontWeight: 600 }}>
              No Revenue Data Available
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mt: 2 }}>
              Complete some tasks to see weekly revenue trends
            </Typography>
          </Card>
        ) : null}

        {/* Profit Chart - CEO Only */}
        {isCEO && profitData.clients.length > 0 && profitData.data.length > 0 && (
          <Card sx={{
            mt: 4,
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{
                fontWeight: 700,
                mb: 1,
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}>
                {viewMode === 'daily' ? 'Daily' : 'Weekly'} Profit Trend by Client
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                {periodLabel} of profit (Revenue - Cost) ({profitData.clients.join(', ')})
              </Typography>

              <Box sx={{
                width: '100%',
                height: { xs: 350, sm: 400, md: 450 },
                position: 'relative'
              }}>
                {allTicketsLoading ? (
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    flexDirection: 'column',
                    gap: 2
                  }}>
                    <CircularProgress size={40} sx={{ color: '#3b82f6' }} />
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Loading profit data...
                    </Typography>
                  </Box>
                ) : (
                  <LineChart
                    dataset={profitData.data}
                    xAxis={[{
                      dataKey: labelKey,
                      scaleType: 'point',
                      label: timeLabel,
                    }]}
                    yAxis={[{
                      label: 'Profit ($)',
                      valueFormatter: (value: number) => `$${value.toLocaleString()}`,
                    }]}
                    series={profitData.clients
                      .filter(client => focusedSeries === null || client === focusedSeries)
                      .map((client) => {
                        const originalIndex = profitData.clients.indexOf(client);
                        return {
                          id: client,
                          dataKey: client,
                          label: client,
                          color: getClientColors(profitData.clients)[originalIndex],
                          curve: 'linear',
                          connectNulls: false,
                        };
                      })}
                    slotProps={{
                      legend: {
                        position: { vertical: 'top', horizontal: 'center' },
                        onItemClick: handleLegendClick,
                      },
                    }}
                    sx={{
                      '& .MuiChartsLegend-series': {
                        cursor: 'pointer !important',
                        userSelect: 'none',
                        '&:hover': {
                          opacity: 0.7,
                        },
                      },
                    }}
                    margin={{ left: 80, right: 20, top: 80, bottom: 50 }}
                    grid={{ vertical: true, horizontal: true }}
                  />
                )}
              </Box>

              {profitData.data.length === 0 && !allTicketsLoading && (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
                    No profit data available for the {periodLabel.toLowerCase()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>
                    Complete some tasks to see profit trends
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section Divider */}
        {(isCEO || isManager) && (
          <Box sx={{
            mt: 6,
            mb: 4,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(100, 116, 139, 0.3), transparent)',
            }
          }}>
            <Typography
              variant="h6"
              sx={{
                textAlign: 'center',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                px: 3,
                py: 1,
                display: 'inline-block',
                position: 'relative',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#64748b',
                fontWeight: 600,
                fontSize: '14px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}
            >
              {isCEO ? 'Manager Analytics' : 'Team Performance Analytics'}
            </Typography>
          </Box>
        )}

        {/* Completed Tasks by Client Chart - CEO & Manager */}
        {(isCEO || isManager) && ticketCountData.clients.length > 0 && ticketCountData.data.length > 0 && (
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{
                fontWeight: 700,
                mb: 1,
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}>
                {viewMode === 'daily' ? 'Daily' : 'Weekly'} Completed Tasks by Client
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                {periodLabel} of completed task volume ({ticketCountData.clients.join(', ')})
              </Typography>

              <Box sx={{
                width: '100%',
                height: { xs: 350, sm: 400, md: 450 },
                position: 'relative'
              }}>
                {allTicketsLoading ? (
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    flexDirection: 'column',
                    gap: 2
                  }}>
                    <CircularProgress size={40} sx={{ color: '#3b82f6' }} />
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Loading task data...
                    </Typography>
                  </Box>
                ) : (
                  <LineChart
                    dataset={ticketCountData.data}
                    xAxis={[{
                      dataKey: labelKey,
                      scaleType: 'point',
                      label: timeLabel,
                    }]}
                    yAxis={[{
                      label: 'Tasks Completed',
                      valueFormatter: (value: number) => value.toString(),
                    }]}
                    series={ticketCountData.clients
                      .filter(client => focusedSeries === null || client === focusedSeries)
                      .map((client) => {
                        const originalIndex = ticketCountData.clients.indexOf(client);
                        return {
                          id: client,
                          dataKey: client,
                          label: client,
                          color: getClientColors(ticketCountData.clients)[originalIndex],
                          curve: 'linear',
                          connectNulls: false,
                        };
                      })}
                    slotProps={{
                      legend: {
                        position: { vertical: 'top', horizontal: 'center' },
                        onItemClick: handleLegendClick,
                      },
                    }}
                    sx={{
                      '& .MuiChartsLegend-series': {
                        cursor: 'pointer !important',
                        userSelect: 'none',
                        '&:hover': {
                          opacity: 0.7,
                        },
                      },
                    }}
                    margin={{ left: 80, right: 20, top: 80, bottom: 50 }}
                    grid={{ vertical: true, horizontal: true }}
                  />
                )}
              </Box>

              {ticketCountData.data.length === 0 && !allTicketsLoading && (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
                    No task completion data available for the {periodLabel.toLowerCase()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>
                    Complete some tasks to see completion trends
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Completed Tasks by Team Member Chart - CEO & Manager */}
        {(isCEO || isManager) && ticketsByPersonData.persons.length > 0 && ticketsByPersonData.data.length > 0 && (
          <Card sx={{
            mt: 4,
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{
                fontWeight: 700,
                mb: 1,
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}>
                {viewMode === 'daily' ? 'Daily' : 'Weekly'} Completed Tasks by Team Member
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                {periodLabel} of individual performance ({ticketsByPersonData.persons.join(', ')})
              </Typography>

              <Box sx={{
                width: '100%',
                height: { xs: 350, sm: 400, md: 450 },
                position: 'relative'
              }}>
                {allTicketsLoading ? (
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    flexDirection: 'column',
                    gap: 2
                  }}>
                    <CircularProgress size={40} sx={{ color: '#3b82f6' }} />
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Loading team data...
                    </Typography>
                  </Box>
                ) : (
                  <LineChart
                    dataset={ticketsByPersonData.data}
                    xAxis={[{
                      dataKey: labelKey,
                      scaleType: 'point',
                      label: timeLabel,
                    }]}
                    yAxis={[{
                      label: 'Tasks Completed',
                      valueFormatter: (value: number) => value.toString(),
                    }]}
                    series={ticketsByPersonData.persons
                      .filter(person => focusedSeries === null || person === focusedSeries)
                      .map((person) => {
                        const originalIndex = ticketsByPersonData.persons.indexOf(person);
                        return {
                          id: person,
                          dataKey: person,
                          label: person,
                          color: getClientColors(ticketsByPersonData.persons)[originalIndex],
                          curve: 'linear',
                          connectNulls: false,
                        };
                      })}
                    slotProps={{
                      legend: {
                        position: { vertical: 'top', horizontal: 'center' },
                        onItemClick: handleLegendClick,
                      },
                    }}
                    sx={{
                      '& .MuiChartsLegend-series': {
                        cursor: 'pointer !important',
                        userSelect: 'none',
                        '&:hover': {
                          opacity: 0.7,
                        },
                      },
                    }}
                    margin={{ left: 80, right: 20, top: 80, bottom: 50 }}
                    grid={{ vertical: true, horizontal: true }}
                  />
                )}
              </Box>

              {ticketsByPersonData.data.length === 0 && !allTicketsLoading && (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
                    No team performance data available for the {periodLabel.toLowerCase()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>
                    Complete some tasks to see team member trends
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default WeeklyRevenue;