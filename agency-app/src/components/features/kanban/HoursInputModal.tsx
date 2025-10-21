// src/components/features/kanban/HoursInputModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Grid,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { AttachMoney as MoneyIcon, Person as PersonIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase/firestore';
import { TeamMember, CompensationStructure, Ticket } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';

interface HoursInputModalProps {
  open: boolean;
  task: Ticket;
  onClose: () => void;
  onComplete: (hoursData: {
    assigneeHours?: number;
    reviewerHours?: number;
    totalCost: number;
    costBreakdown: any;
  }) => void;
}

const HoursInputModal: React.FC<HoursInputModalProps> = ({
  open,
  task,
  onClose,
  onComplete
}) => {
  const { userProfile } = useAuth();
  const [assigneeHours, setAssigneeHours] = useState<number>(0);
  const [reviewerHours, setReviewerHours] = useState<number>(0);
  const [assigneeData, setAssigneeData] = useState<TeamMember | null>(null);
  const [reviewerData, setReviewerData] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isCEO = userProfile?.role === 'CEO';

  useEffect(() => {
    if (open && task) {
      fetchTeamMembers();
    }
  }, [open, task]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      
      // Get assignee data
      if (task.assignedTo) {
        const assigneeQuery = query(usersRef, where('displayName', '==', task.assignedTo));
        const assigneeSnapshot = await getDocs(assigneeQuery);
        if (!assigneeSnapshot.empty) {
          const assigneeDoc = assigneeSnapshot.docs[0];
          setAssigneeData({ id: assigneeDoc.id, ...assigneeDoc.data() } as TeamMember);
        }
      }

      // Get reviewer data
      if (task.reviewedBy) {
        const reviewerQuery = query(usersRef, where('displayName', '==', task.reviewedBy));
        const reviewerSnapshot = await getDocs(reviewerQuery);
        if (!reviewerSnapshot.empty) {
          const reviewerDoc = reviewerSnapshot.docs[0];
          setReviewerData({ id: reviewerDoc.id, ...reviewerDoc.data() } as TeamMember);
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      setError('Failed to load team member data');
    } finally {
      setLoading(false);
    }
  };

  const calculateRate = (compensation: CompensationStructure, taskType: string) => {
    if (!compensation) return 0;
    
    if (compensation.type === 'hourly') {
      return compensation.hourlyRate || 0;
    } else {
      // Fixed rate based on task type
      if (taskType === 'blog' && compensation.blogRate) {
        return compensation.blogRate;
      } else if (taskType === 'tutorial' && compensation.tutorialRate) {
        return compensation.tutorialRate;
      } else if (compensation.blogRate) {
        // Default to blog rate if specific type not found
        return compensation.blogRate;
      } else if (compensation.tutorialRate) {
        // Fallback to tutorial rate
        return compensation.tutorialRate;
      }
      return 0;
    }
  };

  const calculateCost = () => {
    let assigneeCost = 0;
    let reviewerCost = 0;
    let assigneeRate: number | string = 0;
    let reviewerRate: number | string = 0;

    // Ensure task and task.type exist
    const taskType = task?.type || 'blog'; // Default to 'blog' if type is null/undefined

    // Calculate assignee cost
    if (assigneeData?.compensation) {
      if (assigneeData.compensation.type === 'hourly') {
        assigneeRate = assigneeData.compensation.hourlyRate || 0;
        assigneeCost = (assigneeData.compensation.hourlyRate || 0) * assigneeHours;
      } else {
        assigneeRate = 'Fixed';
        assigneeCost = calculateRate(assigneeData.compensation, taskType);
      }
    }

    // Calculate reviewer cost
    if (reviewerData?.compensation) {
      if (reviewerData.compensation.type === 'hourly') {
        reviewerRate = reviewerData.compensation.hourlyRate || 0;
        reviewerCost = (reviewerData.compensation.hourlyRate || 0) * reviewerHours;
      } else {
        reviewerRate = 'Fixed';
        reviewerCost = calculateRate(reviewerData.compensation, taskType);
      }
    }

    return {
      assigneeCost,
      reviewerCost,
      assigneeRate,
      reviewerRate,
      totalCost: assigneeCost + reviewerCost
    };
  };

  const needsAssigneeHours = assigneeData?.compensation?.type === 'hourly';
  const needsReviewerHours = reviewerData?.compensation?.type === 'hourly';

  const handleSubmit = async () => {
    // Validation
    if (needsAssigneeHours && (!assigneeHours || assigneeHours <= 0)) {
      setError('Please enter valid hours for the assignee');
      return;
    }
    if (needsReviewerHours && (!reviewerHours || reviewerHours <= 0)) {
      setError('Please enter valid hours for the reviewer');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const costData = calculateCost();
      
      onComplete({
        ...(needsAssigneeHours && { assigneeHours }),
        ...(needsReviewerHours && { reviewerHours }),
        totalCost: costData.totalCost,
        costBreakdown: costData
      });
    } catch (error) {
      console.error('Error calculating cost:', error);
      setError('Failed to calculate cost');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setAssigneeHours(0);
      setReviewerHours(0);
      setError('');
      onClose();
    }
  };

  // Early return if task is null/undefined
  if (!task) {
    return null;
  }

  if (loading) {
    return (
      <Dialog open={open} maxWidth="sm" fullWidth>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  const costData = calculateCost();
  const taskType = task.type || 'blog'; // Default fallback

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {isCEO ? <MoneyIcon color="primary" /> : <ScheduleIcon color="primary" />}
        <Box>
          <Typography variant="h6">
            {isCEO ? 'Task Completion - Cost Calculation' : 'Task Completion - Hours Input'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {task.title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Assignee Section */}
          {assigneeData && (
            <Grid size={{ xs: 12, md: task.reviewedBy ? 6 : 12 }}>
              <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <PersonIcon color="primary" />
                  <Box>
                    <Typography variant="h6">Assignee</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {assigneeData.displayName}
                    </Typography>
                  </Box>
                </Box>

                {/* Only show compensation details to CEO */}
                {isCEO && assigneeData.compensation && (
                  <Typography variant="body2" gutterBottom>
                    Compensation: {assigneeData.compensation.type === 'hourly' 
                      ? `$${assigneeData.compensation.hourlyRate}/hour`
                      : `Fixed rate ($${calculateRate(assigneeData.compensation, taskType)} for ${taskType})`
                    }
                  </Typography>
                )}

                {needsAssigneeHours ? (
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="Hours worked *"
                      type="number"
                      value={assigneeHours || ''}
                      onChange={(e) => setAssigneeHours(parseFloat(e.target.value) || 0)}
                      disabled={submitting}
                      inputProps={{ min: 0, step: 0.5 }}
                      helperText="Enter the number of hours spent on this task"
                    />
                  </Box>
                ) : (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
                    <Typography variant="body2" color="success.main" fontWeight="bold">
                      {isCEO ? 'Fixed rate applies - no hours input needed' : 'No hours input needed'}
                    </Typography>
                  </Box>
                )}

                {/* Only show cost to CEO */}
                {isCEO && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.lighter', borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Cost: ${costData.assigneeCost.toFixed(2)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          )}

          {/* Reviewer Section */}
          {reviewerData && (
            <Grid size={{ xs: 12, md: task.assignedTo ? 6 : 12 }}>
              <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <PersonIcon color="secondary" />
                  <Box>
                    <Typography variant="h6">Reviewer</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {reviewerData.displayName}
                    </Typography>
                  </Box>
                </Box>

                {/* Only show compensation details to CEO */}
                {isCEO && reviewerData.compensation && (
                  <Typography variant="body2" gutterBottom>
                    Compensation: {reviewerData.compensation.type === 'hourly' 
                      ? `$${reviewerData.compensation.hourlyRate}/hour`
                      : `Fixed rate ($${calculateRate(reviewerData.compensation, taskType)} for ${taskType})`
                    }
                  </Typography>
                )}

                {needsReviewerHours ? (
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="Hours spent reviewing *"
                      type="number"
                      value={reviewerHours || ''}
                      onChange={(e) => setReviewerHours(parseFloat(e.target.value) || 0)}
                      disabled={submitting}
                      inputProps={{ min: 0, step: 0.5 }}
                      helperText="Enter the number of hours spent reviewing this task"
                    />
                  </Box>
                ) : (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
                    <Typography variant="body2" color="success.main" fontWeight="bold">
                      {isCEO ? 'Fixed rate applies - no hours input needed' : 'No hours input needed'}
                    </Typography>
                  </Box>
                )}

                {/* Only show cost to CEO */}
                {isCEO && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'secondary.lighter', borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Cost: ${costData.reviewerCost.toFixed(2)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          )}
        </Grid>

        {/* Total Cost Summary - Only for CEO */}
        {isCEO && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ p: 3, bgcolor: 'success.lighter', borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" color="success.dark">
                Total Task Cost: ${costData.totalCost.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This includes all costs for completion and review of this task
              </Typography>
            </Box>
          </Box>
        )}

        {/* Simple completion message for non-CEO users */}
        {!isCEO && (needsAssigneeHours || needsReviewerHours) && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ p: 3, bgcolor: 'info.lighter', borderRadius: 2 }}>
              <Typography variant="body1" fontWeight="bold" color="info.dark">
                Task Completion
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Please enter the hours spent to complete this task
              </Typography>
            </Box>
          </Box>
        )}

        {/* No compensation warning - only for CEO */}
        {isCEO && !assigneeData?.compensation && !reviewerData?.compensation && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No compensation data found for the team members on this task. Cost will be $0.
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={submitting || (needsAssigneeHours && !assigneeHours) || (needsReviewerHours && !reviewerHours)}
        >
          {submitting ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              {isCEO ? 'Completing...' : 'Submitting...'}
            </>
          ) : (
            isCEO ? 'Complete Task' : 'Submit Hours'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HoursInputModal