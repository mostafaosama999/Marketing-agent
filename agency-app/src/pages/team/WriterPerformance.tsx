// src/pages/team/WriterPerformance.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  Grid,
  Divider,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Person as ManagerIcon,
} from '@mui/icons-material';
import { db } from '../../services/firebase/firestore';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { ticketsService } from '../../services/api/tickets';
import { ticketWithSubcollectionsService } from '../../services/api/ticketSubcollections';
import { TicketWithSubcollections } from '../../types/ticket';

// ReviewHistoryEntry interface moved to types/ticket.ts

// Use TicketWithSubcollections but extend with additional fields needed for performance calculation
interface Task extends TicketWithSubcollections {
  // Backward compatibility fields that are still needed
  completedAt?: any;
  inProgressAt?: any;
  reviewedAt?: any;
  enteredReviewAt?: string;
  aiScore?: number;
  assigneeHours?: number;
  reviewerHours?: number;
  // Financial fields (these will be mapped from financials subcollection)
  totalCost?: number;
  costBreakdown?: {
    assigneeCost: number;
    reviewerCost: number;
    assigneeRate: number | string;
    reviewerRate: number | string;
  };
  actualRevenue?: number;
  estimatedRevenue?: number;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  specialties?: string[];
  joinDate?: string;
  department?: string;
  compensation?: {
    type: 'hourly' | 'fixed';
    hourlyRate?: number;
    blogRate?: number;
    tutorialRate?: number;
  };
}

const WriterPerformance: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [writer, setWriter] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientsData, setClientsData] = useState<{ [key: string]: any }>({});

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

  // Fetch all clients data for rate lookup
  const fetchClientsData = async () => {
    try {
      const clientsRef = collection(db, 'clients');
      const clientsSnapshot = await getDocs(clientsRef);
      const clientsMap: { [key: string]: any } = {};
      
      clientsSnapshot.docs.forEach(doc => {
        const clientData = doc.data();
        if (clientData.name) {
          clientsMap[clientData.name] = clientData;
        }
      });
      
      setClientsData(clientsMap);
    } catch (error) {
      console.error('Error fetching clients data:', error);
    }
  };

  // First useEffect: Fetch writer details
  useEffect(() => {
    if (!userId) return;

    const fetchWriter = async () => {
      try {
        const writerDoc = await getDoc(doc(db, 'users', userId));
        if (writerDoc.exists()) {
          setWriter({ id: writerDoc.id, ...writerDoc.data() } as User);
        }
      } catch (error) {
        console.error('Error fetching writer:', error);
      }
    };

    fetchWriter();
    fetchClientsData();
  }, [userId]);

  // Second useEffect: Fetch tickets with subcollections only after writer is loaded
  useEffect(() => {
    if (!userId || !writer) return;

    // Fetch writer's tickets - match by writer's displayName in assignedTo field
    const unsubscribe = ticketsService.subscribeToTickets(async (ticketsData) => {

      // Filter tickets assigned to this writer by displayName
      const writerTickets = ticketsData.filter(ticket =>
        ticket.assignedTo === writer.displayName ||
        ticket.assignedTo === userId
      );


      // Load subcollections for all tickets (not just completed ones)
      const ticketIds = writerTickets.map(ticket => ticket.id);

      try {
        const ticketsWithSubcollections = await ticketWithSubcollectionsService.getTicketsWithSubcollections(
          ticketIds,
          { financials: true, content: true, timeline: true }
        );


        // Map to Task interface with proper field mapping
        const tasksWithMappedFields: Task[] = await Promise.all(
          ticketsWithSubcollections.map(async (ticket) => {
            // Map timeline data to legacy fields for compatibility
            const timeline = ticket.timeline?.stateHistory;
            const inProgressAt = timeline?.in_progress ? safeToDate(timeline.in_progress) : undefined;
            const completedAt = timeline?.done || timeline?.paid || timeline?.invoiced ?
              safeToDate(timeline.done || timeline.paid || timeline.invoiced) : undefined;
            const reviewedAt = timeline?.internal_review ? safeToDate(timeline.internal_review) : undefined;

            // Legacy scoring data removed - using only reviewHistory from content subcollection

            // Use content completion timestamp if available, otherwise use timeline completion
            const finalCompletedAt = ticket.content?.completedAt
              ? safeToDate(ticket.content.completedAt)
              : completedAt;

            return {
              ...ticket,
              // Map financial fields from subcollection to legacy interface
              totalCost: ticket.financials?.totalCost,
              assigneeHours: ticket.financials?.assigneeHours,
              reviewerHours: ticket.financials?.reviewerHours,
              costBreakdown: ticket.financials?.costBreakdown,
              actualRevenue: ticket.financials?.actualRevenue,
              estimatedRevenue: ticket.financials?.estimatedRevenue,
              // Map timeline fields for calculations
              inProgressAt,
              completedAt: finalCompletedAt,
              reviewedAt,
            } as Task;
          })
        );

        setTasks(tasksWithMappedFields);
        setLoading(false);
      } catch (error) {
        console.error('Error loading tickets with subcollections:', error);
        // Fallback to basic ticket data
        const basicTasks = writerTickets.map(ticket => ({ ...ticket } as Task));
        setTasks(basicTasks);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [userId, writer]);

  // Calculate performance metrics
  
  // 1. Tasks Completed (ALL TIME) - includes done, paid, invoiced
  const getCompletedTasksCount = () => {
    return tasks.filter(task => 
      task.status === 'done' || 
      task.status === 'paid' || 
      task.status === 'invoiced'
    ).length;
  };

  // 2. Average First Draft Rating (from reviewHistory only)
  const getAverageFirstDraftRating = () => {
    const firstDraftScores: number[] = [];


    tasks.forEach(task => {
      // Load reviewHistory from content subcollection if available
      const reviewHistory = task.content?.reviewHistory || [];

      // Use reviewHistory only - first review is first draft
      if (reviewHistory && reviewHistory.length > 0) {
        const firstReview = reviewHistory[0];
        if (firstReview.managerScore) {
          firstDraftScores.push(firstReview.managerScore);
        }
      }
    });


    if (firstDraftScores.length === 0) {
      return null;
    }

    const totalScore = firstDraftScores.reduce((sum, score) => sum + score, 0);
    const average = Math.round(totalScore / firstDraftScores.length);
    return average;
  };

  // 3. Average Second Draft Rating (from reviewHistory only)
  const getAverageSecondDraftRating = () => {
    const secondDraftScores: number[] = [];

    tasks.forEach(task => {
      // Load reviewHistory from content subcollection if available
      const reviewHistory = task.content?.reviewHistory || [];

      // Use reviewHistory only - second review is second draft
      if (reviewHistory && reviewHistory.length >= 2) {
        const secondReview = reviewHistory[1];
        if (secondReview.managerScore) {
          secondDraftScores.push(secondReview.managerScore);
        }
      }
    });

    if (secondDraftScores.length === 0) return null;

    const totalScore = secondDraftScores.reduce((sum, score) => sum + score, 0);
    return Math.round(totalScore / secondDraftScores.length);
  };

  // 4. Average Completion Time for Hourly Writers
  const getAverageHourlyCompletionTime = () => {
    if (!writer?.compensation || writer.compensation.type !== 'hourly') return null;
    
    const completedTasks = tasks.filter(task => 
      (task.status === 'done' || task.status === 'paid' || task.status === 'invoiced') &&
      task.assigneeHours && task.assigneeHours > 0
    );
    
    if (completedTasks.length === 0) return 0;

    const totalHours = completedTasks.reduce((sum, task) => sum + (task.assigneeHours || 0), 0);
    return Math.round(totalHours / completedTasks.length);
  };

  // 5. Average Review Time
  const getAverageReviewTime = () => {
    const reviewedTasks = tasks.filter(task => 
      task.inProgressAt && task.reviewedAt &&
      (task.status === 'done' || task.status === 'paid' || task.status === 'invoiced')
    );
    
    if (reviewedTasks.length === 0) return 0;

    const totalReviewTime = reviewedTasks.reduce((sum, task) => {
      const inProgressAt = safeToDate(task.inProgressAt);
      const reviewedAt = safeToDate(task.reviewedAt);
      if (!inProgressAt || !reviewedAt) return sum;
      const reviewDays = Math.ceil((reviewedAt.getTime() - inProgressAt.getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, reviewDays);
    }, 0);

    return Math.round(totalReviewTime / reviewedTasks.length);
  };

  // 6. Get Client Rate Based on Task Type
  const getClientRate = (clientName: string, taskType: string): number => {
    const client = clientsData[clientName];
    if (!client || !client.compensation) return 0;

    const typeRateMap: { [key: string]: string } = {
      'blog': 'blogRate',
      'tutorial': 'tutorialRate'
    };

    const rateField = typeRateMap[taskType];
    return rateField && client.compensation[rateField] ? client.compensation[rateField] : 0;
  };

  // 7. Calculate Revenue for a Task
  const getTaskRevenue = (task: Task) => {

    // Priority 1: If task has actualRevenue from financials subcollection, use it
    if (task.actualRevenue && task.actualRevenue > 0) {
      return task.actualRevenue;
    }

    // Priority 2: For tasks with clients and types, calculate from client rates
    if (task.clientName && task.type) {
      const clientRate = getClientRate(task.clientName, task.type);
      if (clientRate > 0) {
        return clientRate;
      }
    }

    // Priority 3: Check estimatedRevenue from financials subcollection as fallback
    if (task.estimatedRevenue && task.estimatedRevenue > 0) {
      return task.estimatedRevenue;
    }

    return 0;
  };

  // 7. Calculate Profit for a Task
  const getTaskProfit = (task: Task) => {
    const revenue = getTaskRevenue(task);
    const cost = task.totalCost || 0; // This is now mapped from financials subcollection
    const profit = revenue - cost;

    return profit;
  };

  // 8. Average Profit Per Writer
  const getAverageProfit = () => {
    // Only count tasks that have both revenue and cost
    const profitableTasks = tasks.filter(task => {
      const revenue = getTaskRevenue(task);
      const cost = task.totalCost || 0;
      return revenue > 0 && cost > 0;
    });

    if (profitableTasks.length === 0) return null; // Return null to show 'N/A'

    const totalProfit = profitableTasks.reduce((sum, task) => {
      return sum + getTaskProfit(task);
    }, 0);

    return Math.round(totalProfit / profitableTasks.length);
  };

  // 2. Average Days to Complete - from in_progress to done/paid/invoiced
  const calculateAverageCompletionTime = () => {
    const completedTasks = tasks.filter(task => 
      (task.status === 'done' || task.status === 'paid' || task.status === 'invoiced') &&
      task.inProgressAt && 
      task.completedAt
    );
    
    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => {
      const inProgressAt = safeToDate(task.inProgressAt);
      const completedAt = safeToDate(task.completedAt);
      if (!inProgressAt || !completedAt) return sum;
      const diffInDays = Math.ceil((completedAt.getTime() - inProgressAt.getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, diffInDays); // Ensure non-negative
    }, 0);

    return Math.round(totalTime / completedTasks.length);
  };

  // Overall Average Manager Score (all reviews from reviewHistory)
  const getAverageManagerScore = () => {
    const allScores: number[] = [];

    tasks.forEach(task => {
      // Load reviewHistory from content subcollection if available
      const reviewHistory = task.content?.reviewHistory || [];

      // Add all scores from all reviews
      reviewHistory.forEach(review => {
        if (review.managerScore) {
          allScores.push(review.managerScore);
        }
      });
    });

    if (allScores.length === 0) return null; // Return null to show 'N/A'

    const totalScore = allScores.reduce((sum, score) => sum + score, 0);
    return Math.round(totalScore / allScores.length);
  };

  // 4. On-Time Delivery Rate - completed tasks vs due dates
  const getOnTimeDeliveryRate = () => {
    const completedTasksWithDueDate = tasks.filter(task => 
      (task.status === 'done' || task.status === 'paid' || task.status === 'invoiced') &&
      task.dueDate && 
      task.completedAt
    );
    
    if (completedTasksWithDueDate.length === 0) return 100; // Default to 100% if no due dates

    const onTimeTasks = completedTasksWithDueDate.filter(task => {
      const dueDate = safeToDate(task.dueDate);
      const completedAt = safeToDate(task.completedAt);
      if (!dueDate || !completedAt) return false;
      return completedAt <= dueDate;
    });

    return Math.round((onTimeTasks.length / completedTasksWithDueDate.length) * 100);
  };


  const completedTasksCount = getCompletedTasksCount();
  const averageCompletionTime = calculateAverageCompletionTime();
  const averageManagerScore = getAverageManagerScore();
  const onTimeRate = getOnTimeDeliveryRate();
  const averageFirstDraftRating = getAverageFirstDraftRating();
  const averageSecondDraftRating = getAverageSecondDraftRating();
  const averageHourlyCompletionTime = getAverageHourlyCompletionTime();
  const averageReviewTime = getAverageReviewTime();
  const averageProfit = getAverageProfit();

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress />
        <Typography>Loading writer performance...</Typography>
      </Box>
    );
  }

  if (!loading && !writer) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        flexDirection: 'column'
      }}>
        <Typography variant="h6" color="error">Writer not found</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          User ID: {userId}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please check the URL or contact support if this error persists.
        </Typography>
        <Button onClick={() => navigate('/team')} sx={{ mt: 2 }}>
          Back to Team
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton onClick={() => navigate('/team')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{
          width: 60,
          height: 60,
          mr: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontSize: '24px',
          fontWeight: 600
        }}>
          {writer?.displayName?.charAt(0)?.toUpperCase() || 'U'}
        </Avatar>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            {writer?.displayName || 'Unknown Writer'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Chip
              label={writer?.role || 'Unknown'}
              color={writer?.role === 'Manager' ? 'warning' : 'info'}
              sx={{ fontWeight: 600 }}
            />
            <Typography variant="body2" color="text.secondary">
              {writer?.email || 'No email'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Performance Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {completedTasksCount}
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Tasks Completed (All Time)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {averageCompletionTime || 'N/A'}
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Avg Days to Complete
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ManagerIcon sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {averageManagerScore !== null ? averageManagerScore : 'N/A'}
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Average Manager Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {onTimeRate}%
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                On-Time Delivery Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* New Performance Metrics Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h2" sx={{ fontSize: 30, mb: 1, opacity: 0.9 }}>📝</Typography>
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {averageFirstDraftRating !== null ? averageFirstDraftRating : 'N/A'}
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Avg First Draft Rating
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h2" sx={{ fontSize: 30, mb: 1, opacity: 0.9 }}>✏️</Typography>
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {averageSecondDraftRating !== null ? averageSecondDraftRating : 'N/A'}
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Avg Second Draft Rating
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {writer?.compensation?.type === 'hourly' && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              color: 'white'
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ fontSize: 30, mb: 1, opacity: 0.9 }}>⏰</Typography>
                <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                  {averageHourlyCompletionTime || 'N/A'}
                </Typography>
                <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                  Avg Hours per Article
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid size={{ xs: 12, sm: 6, md: writer?.compensation?.type === 'hourly' ? 3 : 6 }}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h2" sx={{ fontSize: 30, mb: 1, opacity: 0.9 }}>🔍</Typography>
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {averageReviewTime || 'N/A'}
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Avg Review Time (Days)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Profit Metrics Row - Only visible to CEO */}
      {userProfile?.role === 'CEO' && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: 'white'
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ fontSize: 30, mb: 1, opacity: 0.9 }}>💰</Typography>
                <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                  {averageProfit !== null ? (
                    <span style={{ color: averageProfit >= 0 ? 'inherit' : '#ffcdd2' }}>
                      ${averageProfit >= 0 ? '+' : ''}${averageProfit.toLocaleString()}
                    </span>
                  ) : 'N/A'}
                </Typography>
                <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                  Average Profit per Task
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Writer Details */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Writer Details
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Email:</strong> {writer?.email || 'No email'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Department:</strong> {writer?.department || 'Content Team'}
                </Typography>
                {writer?.joinDate && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Joined:</strong> {new Date(writer.joinDate).toLocaleDateString()}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  <strong>Total Tasks:</strong> {tasks.length}
                </Typography>
              </Box>

              {writer?.specialties && writer.specialties.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Specialties
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {writer.specialties.map((specialty, idx) => (
                      <Chip
                        key={idx}
                        label={specialty}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Task Status Overview
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">To Do</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {tasks.filter(t => t.status === 'todo').length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">In Progress</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {tasks.filter(t => t.status === 'in_progress').length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">In Review</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {tasks.filter(t => t.status === 'internal_review').length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="success.main">Done</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    {tasks.filter(t => t.status === 'done').length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="info.main">Invoiced</Typography>
                  <Typography variant="body2" fontWeight="bold" color="info.main">
                    {tasks.filter(t => t.status === 'invoiced').length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="success.main">Paid</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    {tasks.filter(t => t.status === 'paid').length}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Completion Rate
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 0}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0}% of all assigned tasks completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Tasks Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Recent Tasks
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Task Title</strong></TableCell>
                  <TableCell><strong>Client</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Manager Score</strong></TableCell>
                  <TableCell><strong>1st Draft</strong></TableCell>
                  <TableCell><strong>2nd Draft</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                  <TableCell><strong>Completion Time</strong></TableCell>
                  {userProfile?.role === 'CEO' && <TableCell><strong>Profit</strong></TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.slice(0, 15).map((task) => {
                  const createdAt = safeToDate(task.createdAt);
                  const completedAt = safeToDate(task.completedAt);
                  const inProgressAt = safeToDate(task.inProgressAt);
                  
                  let completionDays = null;
                  if (completedAt && inProgressAt) {
                    completionDays = Math.ceil((completedAt.getTime() - inProgressAt.getTime()) / (1000 * 60 * 60 * 24));
                  } else if (completedAt && createdAt) {
                    completionDays = Math.ceil((completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
                  }

                  return (
                    <TableRow key={task.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {task.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {task.clientName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={task.status.replace('_', ' ')}
                          size="small"
                          color={
                            task.status === 'done' || task.status === 'paid' ? 'success' :
                            task.status === 'invoiced' ? 'info' :
                            task.status === 'internal_review' ? 'warning' :
                            task.status === 'client_review' ? 'info' :
                            task.status === 'in_progress' ? 'primary' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // Get overall manager score (average of all reviews)
                          const reviewHistory = task.content?.reviewHistory || [];
                          if (reviewHistory.length === 0) {
                            return (
                              <Typography variant="body2" color="text.secondary">
                                Not scored
                              </Typography>
                            );
                          }

                          const totalScore = reviewHistory.reduce((sum, review) => sum + review.managerScore, 0);
                          const averageScore = Math.round(totalScore / reviewHistory.length);

                          return (
                            <Chip
                              label={averageScore}
                              size="small"
                              color={
                                averageScore >= 85 ? 'success' :
                                averageScore >= 70 ? 'warning' : 'error'
                              }
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // Get first draft score from reviewHistory only
                          const reviewHistory = task.content?.reviewHistory || [];
                          const firstDraftScore = reviewHistory.length > 0 ? reviewHistory[0].managerScore : null;

                          return firstDraftScore ? (
                            <Chip
                              label={firstDraftScore}
                              size="small"
                              color={
                                firstDraftScore >= 85 ? 'success' :
                                firstDraftScore >= 70 ? 'warning' : 'error'
                              }
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // Get second draft score from reviewHistory only
                          const reviewHistory = task.content?.reviewHistory || [];
                          const secondDraftScore = reviewHistory.length >= 2 ? reviewHistory[1].managerScore : null;

                          return secondDraftScore ? (
                            <Chip
                              label={secondDraftScore}
                              size="small"
                              color={
                                secondDraftScore >= 85 ? 'success' :
                                secondDraftScore >= 70 ? 'warning' : 'error'
                              }
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {createdAt ? createdAt.toLocaleDateString() : 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // Show completion time for completed tasks
                          if (task.status === 'done' || task.status === 'paid' || task.status === 'invoiced') {
                            if (completionDays !== null) {
                              return (
                                <Typography variant="body2">
                                  {Math.max(0, completionDays)} day{completionDays !== 1 ? 's' : ''}
                                </Typography>
                              );
                            } else if (completedAt && createdAt) {
                              // Fallback: calculate from creation to completion
                              const fallbackDays = Math.ceil((completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
                              return (
                                <Typography variant="body2" color="warning.main">
                                  {Math.max(0, fallbackDays)} day{fallbackDays !== 1 ? 's' : ''} (total)
                                </Typography>
                              );
                            } else {
                              return (
                                <Typography variant="body2" color="success.main">
                                  Completed
                                </Typography>
                              );
                            }
                          } else if (task.status === 'todo') {
                            return (
                              <Typography variant="body2" color="text.secondary">
                                Not started
                              </Typography>
                            );
                          } else {
                            // For in_progress, internal_review, client_review - show actual in progress
                            return (
                              <Typography variant="body2" color="info.main">
                                In progress
                              </Typography>
                            );
                          }
                        })()}
                      </TableCell>
                      {userProfile?.role === 'CEO' && (
                        <TableCell>
                          {(() => {
                            const profit = getTaskProfit(task);
                            const revenue = getTaskRevenue(task);
                            const cost = task.totalCost || 0;


                            if (revenue > 0 && cost > 0) {
                              const profitColor = profit > 0 ? 'success.main' : profit < 0 ? 'error.main' : 'text.secondary';
                              return (
                                <Box>
                                  <Typography
                                    variant="body2"
                                    fontWeight="bold"
                                    sx={{ color: profitColor }}
                                  >
                                    ${profit >= 0 ? '+' : ''}${profit.toLocaleString()}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    R: ${revenue.toLocaleString()} | C: ${cost.toLocaleString()}
                                  </Typography>
                                </Box>
                              );
                            } else if (revenue > 0) {
                              return (
                                <Typography variant="body2" color="primary.main">
                                  Revenue: ${revenue.toLocaleString()}
                                </Typography>
                              );
                            } else if (cost > 0) {
                              return (
                                <Typography variant="body2" color="text.secondary">
                                  Cost: ${cost.toLocaleString()}
                                </Typography>
                              );
                            } else {
                              return (
                                <Typography variant="body2" color="text.secondary">
                                  -
                                </Typography>
                              );
                            }
                          })()}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          
          {tasks.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No tasks found for this writer
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default WriterPerformance;