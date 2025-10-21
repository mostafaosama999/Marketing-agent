// src/components/features/kanban/TaskDetailModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Button,
  TextField,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Alert,
  Divider,
  InputAdornment,
  Link as MuiLink
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Flag as FlagIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Article as BlogIcon,
  School as TutorialIcon,
  AttachMoney as MoneyIcon,
  Link as LinkIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import TiptapRichTextEditor from '../../common/TiptapRichTextEditor';
import { ticketTimelineService } from '../../../services/api/ticketSubcollections';
import { TicketStatusChange } from '../../../types/ticket';

interface TaskDetailModalProps {
  open: boolean;
  task: any;
  onClose: () => void;
  onUpdate: (updates: any) => void;
  onDelete?: (taskId: string) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  open,
  task,
  onClose,
  onUpdate,
  onDelete
}) => {
  const { userProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [googleDocsError, setGoogleDocsError] = useState<string>('');
  const [editedTask, setEditedTask] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    type: task?.type || 'blog',
    assignedTo: task?.assignedTo || '',
    reviewedBy: task?.reviewedBy || '',
    clientName: task?.clientName || '',
    status: task?.status || 'todo',
    labels: task?.labels || [],
    finalArticleSubmissionGoogleDocsLink: task?.finalArticleSubmissionGoogleDocsLink || ''
  });
  const [newComment, setNewComment] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [validationError, setValidationError] = useState<string>('');
  const [statusChanges, setStatusChanges] = useState<TicketStatusChange[]>([]);

  const taskTypes = [
    { value: 'blog', label: 'Blog Post', icon: BlogIcon, color: '#3b82f6' },
    { value: 'tutorial', label: 'Tutorial', icon: TutorialIcon, color: '#8b5cf6' },
  ];

  // Validation for Google Docs link
  const validateGoogleDocsLink = (link: string): boolean => {
    if (!link) return true; // Optional field
    const googleDocsPattern = /^https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9-_]+/;
    return googleDocsPattern.test(link);
  };

  // Check for validation errors
  const checkValidation = () => {
    if (editedTask.assignedTo && editedTask.reviewedBy && editedTask.assignedTo === editedTask.reviewedBy) {
      setValidationError('A task cannot be reviewed by the person who wrote it. Please select a different reviewer.');
      return false;
    }
    setValidationError('');
    return true;
  };

  // Fetch team members and clients
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const members = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any));
        setTeamMembers(members);
      } catch (error) {
        console.error('Error fetching team members:', error);
      }
    };

    const fetchClients = async () => {
      try {
        const clientsRef = collection(db, 'clients');
        const snapshot = await getDocs(clientsRef);
        const clientsData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };

    if (open) {
      fetchTeamMembers();
      fetchClients();
    }
  }, [open]);

  // Update editedTask when task changes
  useEffect(() => {
    if (task) {
      setEditedTask({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        type: task.type || 'blog',
        assignedTo: task.assignedTo || '',
        reviewedBy: task.reviewedBy || '',
        clientName: task.clientName || '',
        status: task.status || 'todo',
        labels: task.labels || [],
        finalArticleSubmissionGoogleDocsLink: task.finalArticleSubmissionGoogleDocsLink || ''
      });
    }
  }, [task]);

  // Fetch timeline/activity when modal opens
  useEffect(() => {
    const fetchTimeline = async () => {
      if (task?.id && open) {
        try {
          const timeline = await ticketTimelineService.getTimeline(task.id);
          if (timeline?.statusChanges) {
            // Sort by most recent first
            const sortedChanges = [...timeline.statusChanges].sort((a, b) =>
              new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
            );
            setStatusChanges(sortedChanges);
          } else {
            setStatusChanges([]);
          }
        } catch (error) {
          console.error('Error fetching timeline:', error);
          setStatusChanges([]);
        }
      }
    };

    fetchTimeline();
  }, [task?.id, open]);

  const getTaskTypeInfo = (type: string) => {
    return taskTypes.find(t => t.value === type) || taskTypes[0];
  };

  const handleSave = () => {
    // Validate Google Docs link before saving
    if (editedTask.finalArticleSubmissionGoogleDocsLink && !validateGoogleDocsLink(editedTask.finalArticleSubmissionGoogleDocsLink)) {
      setGoogleDocsError('Please enter a valid Google Docs URL');
      return;
    }

    onUpdate(editedTask);
    setEditing(false);
    setGoogleDocsError('');
  };

  const handleDelete = () => {
    if (onDelete && task?.id) {
      onDelete(task.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const addLabel = (label: string) => {
    if (label && !editedTask.labels.includes(label)) {
      setEditedTask(prev => ({
        ...prev,
        labels: [...prev.labels, label]
      }));
      setNewLabel('');
    }
  };

  const removeLabel = (labelToRemove: string) => {
    setEditedTask(prev => ({
      ...prev,
      labels: prev.labels.filter((l: string) => l !== labelToRemove)
    }));
  };

  const handleGoogleDocsLinkChange = (value: string) => {
    setEditedTask(prev => ({ ...prev, finalArticleSubmissionGoogleDocsLink: value }));
    setGoogleDocsError('');
    
    if (value && !validateGoogleDocsLink(value)) {
      setGoogleDocsError('Please enter a valid Google Docs URL');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return '#f5f5f5';
      case 'in_progress': return '#e3f2fd';
      case 'internal_review': return '#fff3e0';
      case 'client_review': return '#f3e5f5';
      case 'done': return '#e8f5e8';
      case 'invoiced': return '#f3e5f5';
      case 'paid': return '#e0f2f1';
      default: return '#f5f5f5';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const formatStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusChangeDescription = (change: TicketStatusChange) => {
    if (change.fromStatus === null) {
      return `created this task in ${formatStatusLabel(change.toStatus)}`;
    }
    return `moved this from ${formatStatusLabel(change.fromStatus)} to ${formatStatusLabel(change.toStatus)}`;
  };

  const formatCostBreakdown = (task: any) => {
    if (!task.totalCost || !task.costBreakdown) return null;

    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
        <Typography variant="subtitle2" fontWeight="bold" color="success.dark" gutterBottom>
          <MoneyIcon sx={{ fontSize: 16, mr: 1 }} />
          Task Cost: ${task.totalCost.toFixed(2)}
        </Typography>
        
        {task.costBreakdown.assigneeCost > 0 && (
          <Typography variant="body2" color="text.secondary">
            Writer ({task.assignedTo}): ${task.costBreakdown.assigneeCost.toFixed(2)}
            {typeof task.costBreakdown.assigneeRate === 'number' && task.assigneeHours 
              ? ` (${task.assigneeHours}h × $${task.costBreakdown.assigneeRate}/h)`
              : ' (Fixed rate)'
            }
          </Typography>
        )}
        
        {task.costBreakdown.reviewerCost > 0 && (
          <Typography variant="body2" color="text.secondary">
            Reviewer ({task.reviewedBy}): ${task.costBreakdown.reviewerCost.toFixed(2)}
            {typeof task.costBreakdown.reviewerRate === 'number' && task.reviewerHours 
              ? ` (${task.reviewerHours}h × $${task.costBreakdown.reviewerRate}/h)`
              : ' (Fixed rate)'
            }
          </Typography>
        )}
      </Box>
    );
  };

  if (!task) return null;

  const currentTypeInfo = getTaskTypeInfo(task.type);
  const TypeIcon = currentTypeInfo.icon;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {editing ? (
            <TextField
              value={editedTask.title}
              onChange={(e) => setEditedTask({...editedTask, title: e.target.value})}
              variant="standard"
              sx={{ fontSize: '1.25rem', fontWeight: 'bold' }}
            />
          ) : (
            <Typography variant="h6" fontWeight="bold">{task.title}</Typography>
          )}
          <Chip 
            label={task.status?.replace('_', ' ')} 
            sx={{ backgroundColor: getStatusColor(task.status) }}
            size="small"
          />
        </Box>
        {(userProfile?.role === 'CEO' || userProfile?.role === 'Manager') && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={() => setEditing(!editing)}>
              <EditIcon />
            </IconButton>
            <IconButton 
              onClick={() => setShowDeleteConfirm(true)}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button 
                  size="small" 
                  color="error" 
                  variant="contained"
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </Box>
            }
            icon={<WarningIcon />}
          >
            <Typography variant="body2" fontWeight="bold">
              Are you sure you want to delete this task?
            </Typography>
            <Typography variant="caption">
              This action cannot be undone. All task data and comments will be permanently removed.
            </Typography>
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Main Content */}
          <Box sx={{ flex: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Description
              </Typography>
              {editing ? (
                <TiptapRichTextEditor
                  value={editedTask.description}
                  onChange={(value) => setEditedTask({...editedTask, description: value})}
                  placeholder="Add a description..."
                  height={150}
                />
              ) : (
                <Box sx={{ 
                  minHeight: '40px', 
                  p: 2, 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 1,
                  bgcolor: '#fafafa'
                }}>
                  {task.description ? (
                    <div dangerouslySetInnerHTML={{ __html: task.description }} />
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                      No description provided
                    </Typography>
                  )}
                </Box>
              )}
            </Box>

            {/* Google Docs Link */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Article Google Docs Link
              </Typography>
              {editing ? (
                <TextField
                  fullWidth
                  value={editedTask.finalArticleSubmissionGoogleDocsLink}
                  onChange={(e) => handleGoogleDocsLinkChange(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  error={!!googleDocsError}
                  helperText={googleDocsError || 'Link to the final Google Docs version of the article'}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              ) : (
                <Box sx={{ 
                  minHeight: '40px', 
                  p: 2, 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 1,
                  bgcolor: '#fafafa'
                }}>
                  {task.finalArticleSubmissionGoogleDocsLink ? (
                    <MuiLink 
                      href={task.finalArticleSubmissionGoogleDocsLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <LinkIcon fontSize="small" />
                      Open Google Docs
                      <OpenInNewIcon fontSize="small" />
                    </MuiLink>
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                      No Google Docs link provided
                    </Typography>
                  )}
                </Box>
              )}
              {googleDocsError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {googleDocsError}
                </Alert>
              )}
            </Box>

            {(task.labels && task.labels.length > 0) || editing ? (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Labels
                </Typography>
                {editing ? (
                  <Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {editedTask.labels.map((label: string, idx: number) => (
                        <Chip
                          key={idx}
                          label={label}
                          onDelete={() => removeLabel(label)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        size="small"
                        placeholder="Add a label..."
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addLabel(newLabel);
                          }
                        }}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => addLabel(newLabel)}
                        disabled={!newLabel.trim()}
                      >
                        Add
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {task.labels?.map((label: string, idx: number) => (
                      <Chip key={idx} label={label} size="small" color="primary" variant="outlined" />
                    ))}
                  </Box>
                )}
              </Box>
            ) : null}

            {/* Cost Information - Only visible to CEO */}
            {userProfile?.role === 'CEO' && formatCostBreakdown(task)}

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Activity
              </Typography>

              {statusChanges.length > 0 ? (
                <List dense>
                  {statusChanges.map((change) => (
                    <ListItem key={change.id} alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {change.changedBy === 'system' ? 'S' : change.changedBy.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" component="span">
                                <strong>{change.changedBy}</strong> {getStatusChangeDescription(change)}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(change.changedAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          change.notes && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {change.notes}
                            </Typography>
                          )
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No activity yet
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Avatar sx={{ width: 32, height: 32 }}>
                  {userProfile?.displayName?.charAt(0) || 'U'}
                </Avatar>
                <TextField
                  fullWidth
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  size="small"
                  disabled
                />
              </Box>
            </Box>
          </Box>

          {/* Sidebar */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Details
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Task Type
              </Typography>
              {editing ? (
                <FormControl fullWidth size="small">
                  <Select
                    value={editedTask.type}
                    onChange={(e) => setEditedTask({...editedTask, type: e.target.value})}
                    renderValue={(value) => {
                      const typeInfo = getTaskTypeInfo(value);
                      const IconComponent = typeInfo.icon;
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconComponent sx={{ fontSize: 16, color: typeInfo.color }} />
                          <Typography variant="body2">{typeInfo.label}</Typography>
                        </Box>
                      );
                    }}
                  >
                    {taskTypes.map(type => {
                      const IconComponent = type.icon;
                      return (
                        <MenuItem key={type.value} value={type.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconComponent sx={{ fontSize: 20, color: type.color }} />
                            <Typography>{type.label}</Typography>
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TypeIcon sx={{ fontSize: 16, color: currentTypeInfo.color }} />
                  <Typography variant="body2">{currentTypeInfo.label}</Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Assigned to
              </Typography>
              {editing ? (
                <FormControl fullWidth size="small">
                  <Select
                    value={editedTask.assignedTo}
                    onChange={(e) => {
                      const newAssignedTo = e.target.value;
                      const updatedTask = {
                        ...editedTask,
                        assignedTo: newAssignedTo,
                        // Clear reviewer if same as new assignee
                        reviewedBy: editedTask.reviewedBy === newAssignedTo ? '' : editedTask.reviewedBy
                      };
                      setEditedTask(updatedTask);
                      // Clear validation error when making changes
                      if (validationError) setValidationError('');
                    }}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Unassigned</em>
                    </MenuItem>
                    {teamMembers.map(member => (
                      <MenuItem key={member.id} value={member.displayName}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24 }}>
                            {member.displayName?.charAt(0)}
                          </Avatar>
                          <Typography>{member.displayName}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 28, height: 28 }}>
                    {task.assignedTo?.split(' ').map((n: string) => n[0]).join('')}
                  </Avatar>
                  <Typography variant="body2">{task.assignedTo || 'Unassigned'}</Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Reviewed by
              </Typography>
              {editing ? (
                <FormControl fullWidth size="small">
                  <Select
                    value={editedTask.reviewedBy}
                    onChange={(e) => {
                      const newReviewedBy = e.target.value;
                      const updatedTask = {...editedTask, reviewedBy: newReviewedBy};
                      setEditedTask(updatedTask);
                      // Validate using the new values directly (no timing issues)
                      if (updatedTask.assignedTo && updatedTask.reviewedBy && updatedTask.assignedTo === updatedTask.reviewedBy) {
                        setValidationError('A task cannot be reviewed by the person who wrote it. Please select a different reviewer.');
                      } else {
                        setValidationError('');
                      }
                    }}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>No reviewer assigned</em>
                    </MenuItem>
                    {teamMembers.filter(member =>
                      (member.role === 'Manager' || member.role === 'CEO') &&
                      member.displayName !== editedTask.assignedTo
                    ).map(member => (
                      <MenuItem key={member.id} value={member.displayName}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24 }}>
                            {member.displayName?.charAt(0)}
                          </Avatar>
                          <Typography>{member.displayName}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 28, height: 28 }}>
                    {task.reviewedBy?.split(' ').map((n: string) => n[0]).join('')}
                  </Avatar>
                  <Typography variant="body2">{task.reviewedBy || 'No reviewer assigned'}</Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Client
              </Typography>
              {editing ? (
                <FormControl fullWidth size="small">
                  <Select
                    value={editedTask.clientName}
                    onChange={(e) => setEditedTask({...editedTask, clientName: e.target.value})}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>No client selected</em>
                    </MenuItem>
                    {clients.map(client => (
                      <MenuItem key={client.id} value={client.name}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                            {client.name?.charAt(0)}
                          </Avatar>
                          <Typography>{client.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Typography variant="body2">{task.clientName || 'No client selected'}</Typography>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Priority
              </Typography>
              {editing ? (
                <FormControl fullWidth size="small">
                  <Select
                    value={editedTask.priority}
                    onChange={(e) => setEditedTask({...editedTask, priority: e.target.value})}
                  >
                    <MenuItem value="low">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                        Low Priority
                      </Box>
                    </MenuItem>
                    <MenuItem value="medium">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                        Medium Priority
                      </Box>
                    </MenuItem>
                    <MenuItem value="high">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} />
                        High Priority
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FlagIcon sx={{ fontSize: 16, color: getPriorityColor(task.priority) }} />
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {task.priority}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Status
              </Typography>
              {editing ? (
                <FormControl fullWidth size="small">
                  <Select
                    value={editedTask.status}
                    onChange={(e) => setEditedTask({...editedTask, status: e.target.value})}
                  >
                    <MenuItem value="todo">To Do</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="internal_review">Internal Review</MenuItem>
                    <MenuItem value="client_review">Client Review</MenuItem>
                    <MenuItem value="done">Done</MenuItem>
                    <MenuItem value="invoiced">Invoiced</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {task.status?.replace('_', ' ')}
                </Typography>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Due Date
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2">
                  {task.dueDate 
                    ? (task.dueDate.seconds 
                        ? new Date(task.dueDate.seconds * 1000).toLocaleDateString()
                        : new Date(task.dueDate).toLocaleDateString())
                    : 'No due date'
                  }
                </Typography>
              </Box>
            </Box>

            {/* Danger Zone - Only for Managers and CEOs */}
            {(userProfile?.role === 'CEO' || userProfile?.role === 'Manager') && (
              <>
                <Divider sx={{ my: 3 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" color="error" gutterBottom>
                    Danger Zone
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setShowDeleteConfirm(true)}
                    fullWidth
                    size="small"
                  >
                    Delete Task
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    This action cannot be undone
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>
      </DialogContent>

      {/* Validation Error Display */}
      {editing && validationError && (
        <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
          {validationError}
        </Alert>
      )}

      <DialogActions>
        {editing ? (
          <>
            <Button onClick={() => setEditing(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              variant="contained"
              disabled={!!googleDocsError || !!validationError}
            >
              Save Changes
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TaskDetailModal;