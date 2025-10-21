// src/components/features/kanban/AddTaskModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  InputAdornment,
  Alert,
} from '@mui/material';
import {
  Article as BlogIcon,
  School as TutorialIcon,
  Business as CaseStudyIcon,
  Description as WhitepaperIcon,
  Share as SocialIcon,
  Email as EmailIcon,
  Web as LandingIcon,
  Category as OtherIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { db } from '../../../services/firebase/firestore';
import { collection, getDocs } from 'firebase/firestore';
import TiptapRichTextEditor from '../../common/TiptapRichTextEditor';

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  newTask: {
    title: string;
    description: string;
    priority: string;
    type: string;
    assignedTo: string;
    reviewedBy?: string;
    clientName: string;
    dueDate?: string;
    finalArticleSubmissionGoogleDocsLink?: string;
  };
  setNewTask: (task: any) => void;
  onAddTask: () => void;
}

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  open,
  onClose,
  newTask,
  setNewTask,
  onAddTask
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [googleDocsError, setGoogleDocsError] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  const taskTypes = [
    { value: 'blog', label: 'Blog Post', icon: BlogIcon, color: '#3b82f6', description: 'Articles and blog content' },
    { value: 'tutorial', label: 'Tutorial', icon: TutorialIcon, color: '#8b5cf6', description: 'Step-by-step guides' },
  ];

  // Validation for Google Docs link
  const validateGoogleDocsLink = (link: string): boolean => {
    if (!link) return true; // Optional field
    const googleDocsPattern = /^https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9-_]+/;
    return googleDocsPattern.test(link);
  };

  // Validation for writer/reviewer conflict
  const validateWriterReviewerConflict = (assignedTo: string, reviewedBy: string): boolean => {
    if (!assignedTo || !reviewedBy) return true; // Allow if either is empty
    return assignedTo !== reviewedBy;
  };

  // Check for validation errors
  const checkValidation = () => {
    if (newTask.assignedTo && newTask.reviewedBy && newTask.assignedTo === newTask.reviewedBy) {
      setValidationError('A task cannot be reviewed by the person who wrote it. Please select a different reviewer.');
      return false;
    }
    setValidationError('');
    return true;
  };

  // Fetch clients and users when modal opens
  useEffect(() => {
    if (open) {
      fetchClients();
      fetchUsers();
    }
  }, [open]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'clients'));
      const clientsData: Client[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.id,
        ...doc.data()
      }));
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          email: doc.data().email || '',
          displayName: doc.data().displayName || doc.data().email || 'Unknown',
          role: doc.data().role || '',
          ...doc.data()
        }))
        // Include all users for comprehensive assignment options

      // Separate assignable users (Writers, Managers, CEOs) from reviewers (Managers and CEOs)
      const assignable = usersData.filter(user => user.role === 'Writer' || user.role === 'Manager' || user.role === 'CEO');
      const reviewerUsers = usersData.filter(user => user.role === 'Manager' || user.role === 'CEO');

      setAssignableUsers(assignable);
      setReviewers(reviewerUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Google Docs link
    if (newTask.finalArticleSubmissionGoogleDocsLink && !validateGoogleDocsLink(newTask.finalArticleSubmissionGoogleDocsLink)) {
      setGoogleDocsError('Please enter a valid Google Docs URL (must start with https://docs.google.com/document/d/)');
      return;
    }

    if (newTask.title.trim() && newTask.clientName && newTask.assignedTo && newTask.type) {
      onAddTask();
    }
  };

  const handleClose = () => {
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      type: 'blog',
      assignedTo: '',
      reviewedBy: '',
      clientName: '',
      dueDate: '',
      finalArticleSubmissionGoogleDocsLink: ''
    });
    setGoogleDocsError('');
    onClose();
  };

  const handleDescriptionChange = (value: string) => {
    setNewTask({ ...newTask, description: value });
  };

  const handleGoogleDocsLinkChange = (value: string) => {
    setNewTask({ ...newTask, finalArticleSubmissionGoogleDocsLink: value });
    setGoogleDocsError('');
    
    if (value && !validateGoogleDocsLink(value)) {
      setGoogleDocsError('Please enter a valid Google Docs URL');
    }
  };

  const getTaskTypeInfo = (typeValue: string) => {
    return taskTypes.find(type => type.value === typeValue) || taskTypes[0];
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 2 }}>
        <Typography variant="h5" fontWeight="bold">
          Create New Task
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Set up a new content task for your team
        </Typography>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Task Title *"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    required
                    autoFocus
                    placeholder="e.g., Write a blog post about AI in marketing"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Task Type *</InputLabel>
                    <Select
                      value={newTask.type}
                      label="Task Type *"
                      onChange={(e) => setNewTask({...newTask, type: e.target.value})}
                      renderValue={(value) => {
                        const typeInfo = getTaskTypeInfo(value);
                        const IconComponent = typeInfo.icon;
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconComponent sx={{ fontSize: 20, color: typeInfo.color }} />
                            <Typography>{typeInfo.label}</Typography>
                          </Box>
                        );
                      }}
                    >
                      {taskTypes.map(type => {
                        const IconComponent = type.icon;
                        return (
                          <MenuItem key={type.value} value={type.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                              <IconComponent sx={{ fontSize: 24, color: type.color }} />
                              <Box>
                                <Typography variant="body1" fontWeight={500}>
                                  {type.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {type.description}
                                </Typography>
                              </Box>
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Client *</InputLabel>
                    <Select
                      value={newTask.clientName}
                      label="Client *"
                      onChange={(e) => setNewTask({...newTask, clientName: e.target.value})}
                    >
                      {clients.map(client => (
                        <MenuItem key={client.id} value={client.name}>
                          {client.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Assigned To *</InputLabel>
                    <Select
                      value={newTask.assignedTo}
                      label="Assigned To *"
                      onChange={(e) => {
                        const newAssignedTo = e.target.value;
                        const updatedTask = {
                          ...newTask,
                          assignedTo: newAssignedTo,
                          // Clear reviewer if same as new assignee
                          reviewedBy: newTask.reviewedBy === newAssignedTo ? '' : newTask.reviewedBy
                        };
                        setNewTask(updatedTask);
                        // Clear validation error when making changes
                        if (validationError) setValidationError('');
                      }}
                    >
                      {assignableUsers.map(user => (
                        <MenuItem key={user.id} value={user.displayName}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: user.role === 'Manager' 
                                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              {user.displayName.charAt(0).toUpperCase()}
                            </Box>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {user.displayName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {user.role}
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel 
                      id="reviewer-select-label"
                      shrink={!!newTask.reviewedBy || false}
                    >
                      Reviewed By
                    </InputLabel>
                    <Select
                      labelId="reviewer-select-label"
                      value={newTask.reviewedBy || ''}
                      label="Reviewed By"
                      onChange={(e) => {
                        const newReviewedBy = e.target.value;
                        const updatedTask = {...newTask, reviewedBy: newReviewedBy};
                        setNewTask(updatedTask);
                        // Validate after setting new value
                        setTimeout(() => checkValidation(), 0);
                      }}
                      displayEmpty
                      notched={!!newTask.reviewedBy || false}
                    >
                      <MenuItem value="">
                        <em style={{ color: '#999' }}></em>
                      </MenuItem>
                      {reviewers.filter(user => user.displayName !== newTask.assignedTo).map(user => (
                        <MenuItem key={user.id} value={user.displayName}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              {user.displayName.charAt(0).toUpperCase()}
                            </Box>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {user.displayName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {user.role}
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={newTask.priority}
                      label="Priority"
                      onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
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
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Due Date"
                    type="date"
                    value={newTask.dueDate || ''}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Article Google Docs Link"
                    value={newTask.finalArticleSubmissionGoogleDocsLink || ''}
                    onChange={(e) => handleGoogleDocsLinkChange(e.target.value)}
                    placeholder="https://docs.google.com/document/d/..."
                    error={!!googleDocsError}
                    helperText={googleDocsError || 'Optional: Link to the final Google Docs version of the article'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LinkIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                  {googleDocsError && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {googleDocsError}
                    </Alert>
                  )}
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight="600">
                    Description
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Provide detailed requirements, target audience, key points to cover, style guidelines, etc.
                  </Typography>
                  <TiptapRichTextEditor
                    value={newTask.description}
                    onChange={handleDescriptionChange}
                    placeholder="Provide detailed requirements, target audience, key points to cover, style guidelines, etc..."
                    height={140}
                  />
                </Grid>
              </Grid>
            )}
          </Box>

          {/* Validation Error Display */}
          {validationError && (
            <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
              {validationError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleClose}
            variant="outlined"
            sx={{ minWidth: 100 }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={loading || !newTask.title.trim() || !newTask.clientName || !newTask.assignedTo || !newTask.type || !!googleDocsError || !!validationError}
            sx={{ 
              minWidth: 120,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              }
            }}
          >
            Create Task
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddTaskModal;