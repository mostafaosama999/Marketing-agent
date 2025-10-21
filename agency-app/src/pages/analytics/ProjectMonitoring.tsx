// src/pages/analytics/ProjectMonitoring.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Switch,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Stack,
  Avatar,
  CardHeader,
  IconButton
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notifications as AlertIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { alertRulesService } from '../../services/api/alertRules';
import AlertRuleForm from '../../components/forms/AlertRuleForm';
import { AlertRule } from '../../types';
import { useMonitoringDashboard } from '../../hooks/useMonitoringMetrics';


const ProjectMonitoring: React.FC = () => {
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertLoading, setAlertLoading] = useState(false);

  // Use optimized monitoring hook
  const {
    taskMetrics,
    writerMetrics,
    loading: monitoringLoading,
    error: monitoringError
  } = useMonitoringDashboard(selectedDuration);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' as 'info' | 'error' | 'success' });
  const [liveAlertResults, setLiveAlertResults] = useState<Record<string, any[]>>({});
  const [liveResultsLoading, setLiveResultsLoading] = useState<Record<string, boolean>>({});

  // Form state for alert rule creation
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'ticket-based' as 'ticket-based' | 'writer-based' | 'client-based',
    enabled: true,
    slackChannel: '',
    // Task-based conditions
    statuses: [] as string[],
    daysInState: 3,
    clientName: '',
    taskType: '',
    // Writer-based and client-based conditions
    alertType: 'no-tasks-assigned' as 'no-tasks-assigned' | 'overloaded' | 'inactive' | 'no-recent-tickets' | 'no-new-tickets',
    thresholdDays: 7,
    maxTasks: 5,
    writerName: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});


  // Handle monitoring errors
  useEffect(() => {
    if (monitoringError) {
      setAlert({ show: true, message: monitoringError, severity: 'error' });
    }
  }, [monitoringError]);

  // Load alert rules
  const loadAlertRules = async () => {
    try {
      setAlertLoading(true);
      const rules = await alertRulesService.getAllAlertRules();
      setAlertRules(rules);
      await runLiveAlertTests(rules);
    } catch (error) {
      console.error('Error loading alert rules:', error);
      setAlert({ show: true, message: 'Error loading alert rules', severity: 'error' });
    } finally {
      setAlertLoading(false);
    }
  };

  // Run live alert tests
  const runLiveAlertTests = async (rules?: AlertRule[]) => {
    const rulesToTest = rules || alertRules;
    const enabledRules = rulesToTest.filter(rule => rule.enabled);
    
    const results: Record<string, any[]> = {};
    for (const rule of enabledRules) {
      setLiveResultsLoading(prev => ({ ...prev, [rule.id]: true }));
      try {
        const ruleResults = await alertRulesService.testAlertRule(rule);
        results[rule.id] = ruleResults;
      } catch (error) {
        console.error(`Error testing rule ${rule.name}:`, error);
        results[rule.id] = [];
      }
      setLiveResultsLoading(prev => ({ ...prev, [rule.id]: false }));
    }
    
    setLiveAlertResults(results);
  };

  // Form handling functions
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'ticket-based',
      enabled: true,
      slackChannel: '',
      statuses: [],
      daysInState: 3,
      clientName: '',
      taskType: '',
      alertType: 'no-tasks-assigned',
      thresholdDays: 7,
      maxTasks: 5,
      writerName: ''
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Rule name is required';
    }

    if (!formData.slackChannel.trim()) {
      errors.slackChannel = 'Slack channel is required';
    }

    if (formData.type === 'ticket-based') {
      const checkType = (formData as any).checkType || 'status-duration';

      // Only require status selection for status-duration mode
      if (checkType === 'status-duration' && formData.statuses.length === 0) {
        errors.statuses = 'At least one status must be selected';
      }

      if (formData.daysInState < 1) {
        errors.daysInState = 'Days threshold must be at least 1';
      }
    } else {
      if (formData.alertType === 'inactive' && formData.thresholdDays < 1) {
        errors.thresholdDays = 'Threshold days must be at least 1';
      }
      if (formData.alertType === 'overloaded' && formData.maxTasks < 1) {
        errors.maxTasks = 'Max tasks must be at least 1';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Alert rule handlers
  const handleSaveRule = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const now = new Date().toISOString();
      const ruleData: any = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        enabled: formData.enabled,
        slackChannel: formData.slackChannel,
        createdAt: editingRule?.createdAt || now,
        updatedAt: now,
        conditions: formData.type === 'ticket-based' ? (() => {
          const conditions: any = {
            statuses: formData.statuses,
            daysInState: formData.daysInState
          };
          // Include checkType if specified (defaults to 'status-duration' in backend)
          if ((formData as any).checkType) {
            conditions.checkType = (formData as any).checkType;
          }
          if (formData.clientName) conditions.clientName = formData.clientName;
          if (formData.taskType) conditions.taskType = formData.taskType;
          return conditions;
        })() : formData.type === 'writer-based' ? (() => {
          const conditions: any = {
            alertType: formData.alertType
          };
          if (formData.alertType === 'inactive' && formData.thresholdDays) {
            conditions.thresholdDays = formData.thresholdDays;
          }
          if (formData.alertType === 'overloaded' && formData.maxTasks) {
            conditions.maxTasks = formData.maxTasks;
          }
          if (formData.writerName) conditions.writerName = formData.writerName;
          return conditions;
        })() : (() => {
          // Client-based conditions
          const conditions: any = {
            alertType: formData.alertType,
            thresholdDays: formData.thresholdDays
          };
          if (formData.clientName) conditions.clientName = formData.clientName;
          return conditions;
        })()
      };

      if (editingRule) {
        await alertRulesService.updateAlertRule(editingRule.id, ruleData);
        setAlert({ show: true, message: 'Alert rule updated successfully', severity: 'success' });
      } else {
        await alertRulesService.createAlertRule(ruleData);
        setAlert({ show: true, message: 'Alert rule created successfully', severity: 'success' });
      }
      
      loadAlertRules(); // Refresh the list
      setOpenDialog(false);
      setEditingRule(null);
      resetForm();
    } catch (error) {
      console.error('Error saving alert rule:', error);
      setAlert({ 
        show: true, 
        message: `Error ${editingRule ? 'updating' : 'creating'} alert rule`, 
        severity: 'error' 
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await alertRulesService.deleteAlertRule(ruleId);
      setAlertRules(prev => prev.filter(rule => rule.id !== ruleId));
      setAlert({ show: true, message: 'Alert rule deleted', severity: 'success' });
    } catch (error) {
      setAlert({ show: true, message: 'Error deleting alert rule', severity: 'error' });
    }
  };


  const handleToggleAlert = async (ruleId: string, enabled: boolean) => {
    try {
      await alertRulesService.updateAlertRule(ruleId, { enabled });
      setAlertRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, enabled } : rule
      ));
      setAlert({ show: true, message: 'Alert rule updated', severity: 'success' });
    } catch (error) {
      setAlert({ show: true, message: 'Error updating alert rule', severity: 'error' });
    }
  };

  const handleCreateAlert = () => {
    resetForm();
    setEditingRule(null);
    setOpenDialog(true);
  };

  const handleEditAlert = (rule: AlertRule) => {
    setEditingRule(rule);
    // Populate form with rule data
    setFormData({
      name: rule.name,
      description: rule.description,
      type: rule.type,
      enabled: rule.enabled,
      slackChannel: rule.slackChannel,
      // Ticket-based conditions
      statuses: rule.type === 'ticket-based' ? (rule as any).conditions.statuses : [],
      daysInState: rule.type === 'ticket-based' ? (rule as any).conditions.daysInState : 3,
      clientName: rule.type === 'ticket-based' ? (rule as any).conditions.clientName || '' :
                  rule.type === 'client-based' ? (rule as any).conditions.clientName || '' : '',
      taskType: rule.type === 'ticket-based' ? (rule as any).conditions.taskType || '' : '',
      // Writer-based and client-based conditions
      alertType: rule.type === 'writer-based' ? (rule as any).conditions.alertType : 
                 rule.type === 'client-based' ? (rule as any).conditions.alertType : 'no-tasks-assigned',
      thresholdDays: rule.type === 'writer-based' ? (rule as any).conditions.thresholdDays || 7 :
                     rule.type === 'client-based' ? (rule as any).conditions.thresholdDays || 7 : 7,
      maxTasks: rule.type === 'writer-based' ? (rule as any).conditions.maxTasks || 5 : 5,
      writerName: rule.type === 'writer-based' ? (rule as any).conditions.writerName || '' : ''
    });
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingRule(null);
    resetForm();
  };

  const handleDeleteAlert = (ruleId: string) => {
    setRuleToDelete(ruleId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (ruleToDelete) {
      await handleDeleteRule(ruleToDelete);
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setRuleToDelete(null);
  };

  useEffect(() => {
    loadAlertRules();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'available': return '#2196f3';
      case 'overloaded': return '#ff9800';
      case 'inactive': return '#f44336';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckIcon />;
      case 'available': return <PersonIcon />;
      case 'overloaded': return <WarningIcon />;
      case 'inactive': return <ScheduleIcon />;
      default: return <PersonIcon />;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssessmentIcon fontSize="large" />
          Task Performance Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor task creation and completion metrics to optimize team performance
        </Typography>
      </Box>

      {/* Task Analytics Section */}
      <Paper sx={{ width: '100%', mb: 4, p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon />
            Analysis Period
          </Typography>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Duration</InputLabel>
            <Select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value as number)}
              label="Duration"
              size="small"
            >
              <MenuItem value={7}>Last 7 days</MenuItem>
              <MenuItem value={14}>Last 14 days</MenuItem>
              <MenuItem value={30}>Last 30 days</MenuItem>
              <MenuItem value={90}>Last 90 days</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {monitoringLoading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : taskMetrics && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
                border: '1px solid #4caf50'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <AssessmentIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Tasks Created
                      </Typography>
                      <Typography variant="h4">
                        {taskMetrics.totalTasksCreated}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                border: '1px solid #2196f3'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <CheckIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Tasks Completed
                      </Typography>
                      <Typography variant="h4">
                        {taskMetrics.totalTasksCompleted}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%)',
                border: '1px solid #ff9800'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <ScheduleIcon color="warning" sx={{ mr: 2, fontSize: 40 }} />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Avg. Completion Time
                      </Typography>
                      <Typography variant="h4">
                        {taskMetrics.averageTimeToComplete.toFixed(1)} days
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                border: '1px solid #f44336'
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <WarningIcon color="error" sx={{ mr: 2, fontSize: 40 }} />
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        Stuck Tasks
                      </Typography>
                      <Typography variant="h4">
                        {taskMetrics.stuckTasks.length}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {taskMetrics.stuckTasks.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Stuck Tasks (7+ days in current state)
                    </Typography>
                    <Grid container spacing={2}>
                      {taskMetrics.stuckTasks.map(task => (
                        <Grid size={{ xs: 12, md: 6 }} key={task.id}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {task.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Status: {task.status} | Client: {task.clientName}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}
      </Paper>

      {/* Alert Rules Section */}
      <Paper sx={{ width: '100%', mb: 4, p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AlertIcon />
            Alert Rules Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateAlert}
          >
            Create Alert Rule
          </Button>
        </Box>

        {alertLoading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {alertRules.map((rule) => (
              <Grid size={{ xs: 12, md: 6 }} key={rule.id}>
                <Card sx={{ height: 'fit-content' }}>
                  <CardHeader
                    sx={{ pb: 1 }}
                    title={
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Switch
                            checked={rule.enabled}
                            onChange={(e) => handleToggleAlert(rule.id, e.target.checked)}
                            size="small"
                          />
                          <Typography variant="subtitle1" fontWeight="medium">
                            {rule.name}
                          </Typography>
                          <Chip 
                            label={rule.type} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: '20px' }}
                          />
                        </Box>
                        <Box display="flex" gap={0.5}>
                          <IconButton onClick={() => handleEditAlert(rule)} size="small">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteAlert(rule.id)} size="small">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    }
                  />
                  <CardContent sx={{ pt: 1, pb: 2 }}>
                    {rule.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.875rem' }}>
                        {rule.description}
                      </Typography>
                    )}
                    
                    <Box sx={{ mb: 1.5 }}>
                      {rule.type === 'ticket-based' ? (
                        <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                          🎯 Alert when{' '}
                          <strong>
                            {(rule as any).conditions?.taskType 
                              ? `${(rule as any).conditions.taskType} posts` 
                              : 'any tasks'}
                          </strong>
                          {' from '}
                          <strong>
                            {(rule as any).conditions?.clientName || 'any client'}
                          </strong>
                          {(rule as any).conditions?.statuses?.length > 0 && (
                            <>
                              {' stuck in '}
                              <strong>
                                {(rule as any).conditions.statuses[0].replace('_', ' ').toLowerCase()}
                              </strong>
                            </>
                          )}
                          {(rule as any).conditions?.daysInState && (
                            <>
                              {' for '}
                              <strong>{(rule as any).conditions.daysInState}+ days</strong>
                            </>
                          )}
                        </Typography>
                      ) : rule.type === 'writer-based' ? (
                        <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                          👤 Alert for{' '}
                          <strong>
                            {(rule as any).conditions?.alertType === 'no-tasks-assigned' ? 'writers with no tasks' :
                             (rule as any).conditions?.alertType === 'overloaded' ? `writers with ${(rule as any).conditions?.maxTasks || 5}+ active tasks` :
                             (rule as any).conditions?.alertType === 'inactive' ? `writers inactive for ${(rule as any).conditions?.thresholdDays || 7}+ days` :
                             'writers'}
                          </strong>
                          {(rule as any).conditions?.writerName && (
                            <> • Filter: <strong>{(rule as any).conditions.writerName}</strong></>
                          )}
                        </Typography>
                      ) : rule.type === 'client-based' ? (
                        <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                          🏢 Alert when{' '}
                          <strong>
                            {(rule as any).conditions?.clientName || 'any client'}
                          </strong>
                          {' has '}
                          <strong>
                            {(rule as any).conditions?.alertType === 'no-recent-tickets' ? 'no recent tickets' : 'no ticket activity'}
                          </strong>
                          {' for '}
                          <strong>{(rule as any).conditions?.thresholdDays || 'N/A'}+ days</strong>
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="error" sx={{ fontSize: '0.85rem' }}>
                          ⚠️ Unknown alert type: {(rule as any).type}
                        </Typography>
                      )}
                    </Box>

                    {/* Live Results */}
                    {liveResultsLoading[rule.id] ? (
                      <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}>
                        <CircularProgress size={14} />
                        <Typography variant="caption" color="text.secondary">Testing...</Typography>
                      </Box>
                    ) : liveAlertResults[rule.id] ? (
                      <Alert
                        severity={liveAlertResults[rule.id].length > 0 ? "warning" : "success"}
                        sx={{ mt: 1, py: 0.5 }}
                        icon={false}
                      >
                        <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                          {rule.type === 'client-based' ? (
                            <>📊 Live Test: Alert would {liveAlertResults[rule.id].length > 0 ? '🔥 trigger' : '✓ not trigger'}</>
                          ) : (
                            <>📊 Live Test: {liveAlertResults[rule.id].length} items found</>
                          )}
                        </Typography>
                        {liveAlertResults[rule.id].length > 0 && (
                          <Box sx={{ mt: 0.5 }}>
                            {rule.type === 'client-based' ? (
                              liveAlertResults[rule.id].map((item: any, idx: number) => (
                                <Typography key={idx} variant="caption" display="block" sx={{ fontSize: '0.7rem', opacity: 0.8 }}>
                                  • {item.clientName}: {item.issue}
                                </Typography>
                              ))
                            ) : (
                              liveAlertResults[rule.id].map((item: any, idx: number) => (
                                <Typography key={idx} variant="caption" display="block" sx={{ fontSize: '0.7rem', opacity: 0.8 }}>
                                  • {item.title || item.writerName || item.email}
                                </Typography>
                              ))
                            )}
                          </Box>
                        )}
                      </Alert>
                    ) : null}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Writer Performance Section */}
      <Paper sx={{ width: '100%', mb: 4, p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            Writer Performance
          </Typography>
        </Box>
        
        {monitoringLoading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {writerMetrics.map((writer) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={writer.writerName}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar sx={{ 
                        bgcolor: getStatusColor(writer.status),
                        mr: 2 
                      }}>
                        {getStatusIcon(writer.status)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {writer.writerName}
                        </Typography>
                        <Chip
                          label={writer.status}
                          size="small"
                          sx={{ 
                            bgcolor: getStatusColor(writer.status),
                            color: 'white',
                            textTransform: 'capitalize'
                          }}
                        />
                      </Box>
                    </Box>
                    <Stack spacing={1}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Assigned Tasks:</Typography>
                        <Typography variant="body2" fontWeight="bold">{writer.assignedTasks}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Completed:</Typography>
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          {writer.completedTasks}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">In Progress:</Typography>
                        <Typography variant="body2" fontWeight="bold" color="warning.main">
                          {writer.inProgressTasks}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Internal Review:</Typography>
                        <Typography variant="body2" fontWeight="bold" color="info.main">
                          {writer.internalReviewTasks}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Client Review:</Typography>
                        <Typography variant="body2" fontWeight="bold" color="secondary.main">
                          {writer.clientReviewTasks}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Simple Alert Rule Dialog */}
      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
        </DialogTitle>
        <DialogContent>
          <AlertRuleForm
            formData={formData}
            formErrors={formErrors}
            setFormData={setFormData}
          />        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSaveRule} variant="contained">
            {editingRule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDelete}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Delete Alert Rule
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this alert rule? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Cancel</Button>
          <Button onClick={confirmDelete} variant="contained" color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.show}
        autoHideDuration={6000}
        onClose={() => setAlert(prev => ({ ...prev, show: false }))}
      >
        <Alert 
          onClose={() => setAlert(prev => ({ ...prev, show: false }))}
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProjectMonitoring;