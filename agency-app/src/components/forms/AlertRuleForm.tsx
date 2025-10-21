// src/components/forms/AlertRuleForm.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Typography,
  CircularProgress,
} from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase/firestore';

interface AlertRuleFormProps {
  formData: {
    name: string;
    description: string;
    type: 'ticket-based' | 'writer-based' | 'client-based';
    enabled: boolean;
    slackChannel: string;
    statuses: string[];
    daysInState: number;
    clientName: string;
    taskType: string;
    alertType: 'no-tasks-assigned' | 'overloaded' | 'inactive' | 'no-recent-tickets' | 'no-new-tickets';
    thresholdDays: number;
    maxTasks: number;
    writerName: string;
  };
  formErrors: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    description: string;
    type: 'ticket-based' | 'writer-based' | 'client-based';
    enabled: boolean;
    slackChannel: string;
    statuses: string[];
    daysInState: number;
    clientName: string;
    taskType: string;
    alertType: 'no-tasks-assigned' | 'overloaded' | 'inactive' | 'no-recent-tickets' | 'no-new-tickets';
    thresholdDays: number;
    maxTasks: number;
    writerName: string;
  }>>;
}

const AlertRuleForm: React.FC<AlertRuleFormProps> = ({ formData, formErrors, setFormData }) => {
  const [clients, setClients] = useState<{ id: string; name: string; }[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Fetch clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        const clientsData = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Unnamed Client'
        }));
        
        // Sort clients alphabetically
        clientsData.sort((a, b) => a.name.localeCompare(b.name));
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  return (
    <Box sx={{ mt: 2 }}>
      {/* Basic Information */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Rule Name *"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            error={!!formErrors.name}
            helperText={formErrors.name}
            required
          />
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Slack Channel *"
            value={formData.slackChannel}
            onChange={(e) => setFormData(prev => ({ ...prev, slackChannel: e.target.value }))}
            error={!!formErrors.slackChannel}
            helperText={formErrors.slackChannel}
            placeholder="#alerts"
            required
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what this alert rule monitors..."
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth>
            <InputLabel>Alert Type</InputLabel>
            <Select
              value={formData.type}
              label="Alert Type"
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
            >
              <MenuItem value="ticket-based">Task-Based Alert</MenuItem>
              <MenuItem value="writer-based">Writer-Based Alert</MenuItem>
              <MenuItem value="client-based">Client-Based Alert</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography>Enabled:</Typography>
            <Switch
              checked={formData.enabled}
              onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
              color="primary"
            />
          </Box>
        </Grid>
      </Grid>

      {/* Task-Based Alert Configuration */}
      {formData.type === 'ticket-based' && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Multi-Criteria Task Alert Settings
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create sophisticated alerts: "For tasks of type <strong>X</strong>, from client <strong>Y</strong>, alert when stuck in state <strong>Z</strong> for more than <strong>A</strong> days"
          </Typography>

          <Grid container spacing={3}>
            {/* Check Type Selection */}
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Alert Condition Type *</InputLabel>
                <Select
                  value={(formData as any).checkType || 'status-duration'}
                  label="Alert Condition Type *"
                  onChange={(e) => setFormData(prev => ({ ...prev, checkType: e.target.value as any }))}
                >
                  <MenuItem value="status-duration">
                    <Box>
                      <Typography variant="body2" fontWeight="bold">Days in Current Status</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Alert when ticket stays in the same status for too long (e.g., 5 days in client_review)
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="ticket-age">
                    <Box>
                      <Typography variant="body2" fontWeight="bold">Ticket Age (Days Since Creation)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Alert when ticket was created X days ago and still hasn't been completed (regardless of status changes)
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {/* Task Type Selection */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Task Type Filter</InputLabel>
                <Select
                  value={formData.taskType}
                  label="Task Type Filter"
                  onChange={(e) => setFormData(prev => ({ ...prev, taskType: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>All Task Types</em>
                  </MenuItem>
                  <MenuItem value="blog">Blog Posts</MenuItem>
                  <MenuItem value="tutorial">Tutorials</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Client Selection */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Client Filter</InputLabel>
                <Select
                  value={formData.clientName}
                  label="Client Filter"
                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  disabled={loadingClients}
                >
                  <MenuItem value="">
                    <em>All Clients</em>
                  </MenuItem>
                  {loadingClients ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Loading clients...
                    </MenuItem>
                  ) : (
                    clients.map((client) => (
                      <MenuItem key={client.id} value={client.name}>
                        {client.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>

            {/* Single Status Selection - Only show for status-duration check type */}
            {(formData as any).checkType !== 'ticket-age' && (
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth error={!!formErrors.statuses}>
                  <InputLabel>Alert When Stuck In State *</InputLabel>
                  <Select
                    value={formData.statuses.length > 0 ? formData.statuses[0] : ''}
                    label="Alert When Stuck In State *"
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      statuses: e.target.value ? [e.target.value] : []
                    }))}
                  >
                    <MenuItem value="todo">To Do</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="internal_review">Internal Review</MenuItem>
                    <MenuItem value="client_review">Client Review</MenuItem>
                    <MenuItem value="done">Done</MenuItem>
                    <MenuItem value="invoiced">Invoiced</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                  </Select>
                  {formErrors.statuses ? (
                    <Typography variant="caption" color="error">
                      {formErrors.statuses}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Alert when ticket remains in this status too long
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            )}

            {/* Days Threshold */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Days Threshold *"
                type="number"
                value={formData.daysInState}
                onChange={(e) => setFormData(prev => ({ ...prev, daysInState: parseInt(e.target.value) || 0 }))}
                error={!!formErrors.daysInState}
                helperText={
                  formErrors.daysInState ||
                  ((formData as any).checkType === 'ticket-age'
                    ? "Alert when ticket is this many days old"
                    : "Alert when ticket is stuck for this many days")
                }
                inputProps={{ min: 1 }}
                required
              />
            </Grid>
          </Grid>

          {/* Preview of alert criteria */}
          {(formData.statuses.length > 0 || formData.taskType || formData.clientName || formData.daysInState > 0 || (formData as any).checkType === 'ticket-age') && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Alert Preview:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {(formData as any).checkType === 'ticket-age' ? (
                  <>
                    Alert when{' '}
                    <strong>
                      {formData.taskType ? `${formData.taskType} posts` : 'any tasks'}
                    </strong>
                    {' from '}
                    <strong>
                      {formData.clientName || 'any client'}
                    </strong>
                    {formData.daysInState > 0 && (
                      <>
                        {' were created more than '}
                        <strong>{formData.daysInState} days ago</strong>
                      </>
                    )}
                    {' and are not yet completed (not in done/invoiced/paid)'}
                  </>
                ) : (
                  <>
                    Alert when{' '}
                    <strong>
                      {formData.taskType ? `${formData.taskType} posts` : 'any tasks'}
                    </strong>
                    {' from '}
                    <strong>
                      {formData.clientName || 'any client'}
                    </strong>
                    {formData.statuses.length > 0 && (
                      <>
                        {' are stuck in '}
                        <strong>
                          {formData.statuses[0].replace('_', ' ').toLowerCase()}
                        </strong>
                        {' state'}
                      </>
                    )}
                    {formData.daysInState > 0 && (
                      <>
                        {' for more than '}
                        <strong>{formData.daysInState} days</strong>
                      </>
                    )}
                  </>
                )}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Writer-Based Alert Configuration */}
      {formData.type === 'writer-based' && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Writer-Based Alert Settings
          </Typography>
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Alert Condition</InputLabel>
                <Select
                  value={formData.alertType}
                  label="Alert Condition"
                  onChange={(e) => setFormData(prev => ({ ...prev, alertType: e.target.value as any }))}
                >
                  <MenuItem value="no-tasks-assigned">No Tasks Assigned</MenuItem>
                  <MenuItem value="overloaded">Too Many Active Tasks</MenuItem>
                  <MenuItem value="inactive">No Recent Activity</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {formData.alertType === 'overloaded' && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Max Active Tasks"
                  type="number"
                  value={formData.maxTasks}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxTasks: parseInt(e.target.value) || 0 }))}
                  error={!!formErrors.maxTasks}
                  helperText={formErrors.maxTasks || "Alert when writer has more than this many active tasks"}
                  inputProps={{ min: 1 }}
                />
              </Grid>
            )}

            {formData.alertType === 'inactive' && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Inactive Days Threshold"
                  type="number"
                  value={formData.thresholdDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, thresholdDays: parseInt(e.target.value) || 0 }))}
                  error={!!formErrors.thresholdDays}
                  helperText={formErrors.thresholdDays || "Alert when writer has no activity for this many days"}
                  inputProps={{ min: 1 }}
                />
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Writer Filter (Optional)"
                value={formData.writerName}
                onChange={(e) => setFormData(prev => ({ ...prev, writerName: e.target.value }))}
                placeholder="Leave empty for all writers"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Client-Based Alert Configuration */}
      {formData.type === 'client-based' && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Client-Based Alert Settings
          </Typography>
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Alert Condition</InputLabel>
                <Select
                  value={formData.alertType}
                  label="Alert Condition"
                  onChange={(e) => setFormData(prev => ({ ...prev, alertType: e.target.value as any }))}
                >
                  <MenuItem value="no-recent-tickets">No Recent Tickets Created</MenuItem>
                  <MenuItem value="no-new-tickets">No Ticket Activity</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Inactivity Days Threshold"
                type="number"
                value={formData.thresholdDays}
                onChange={(e) => setFormData(prev => ({ ...prev, thresholdDays: parseInt(e.target.value) || 0 }))}
                error={!!formErrors.thresholdDays}
                helperText={formErrors.thresholdDays || "Alert when client has no activity for this many days"}
                inputProps={{ min: 1 }}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Client Filter (Optional)</InputLabel>
                <Select
                  value={formData.clientName}
                  label="Client Filter (Optional)"
                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  disabled={loadingClients}
                >
                  <MenuItem value="">
                    <em>All Clients</em>
                  </MenuItem>
                  {loadingClients ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Loading clients...
                    </MenuItem>
                  ) : (
                    clients.map((client) => (
                      <MenuItem key={client.id} value={client.name}>
                        {client.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default AlertRuleForm;