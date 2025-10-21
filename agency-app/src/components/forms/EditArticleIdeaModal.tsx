// src/components/forms/EditArticleIdeaModal.tsx
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
  Chip,
  Typography,
  Alert,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

interface ArticleIdea {
  id: string;
  clientId: string;
  title: string;
  description: string;
  targetMonth: string;
  status: 'idea' | 'assigned' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  type: 'blog' | 'tutorial';
  estimatedWordCount: number;
  targetKeywords: string[];
  category: string;
  createdAt: any;
  assignedTo?: string;
  taskId?: string;
}

interface EditArticleIdeaModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (articleData: ArticleIdea) => void;
  article: ArticleIdea | null;
  clientName: string;
}

const EditArticleIdeaModal: React.FC<EditArticleIdeaModalProps> = ({
  open,
  onClose,
  onSubmit,
  article,
  clientName
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetMonth: '',
    status: 'idea' as 'idea' | 'assigned' | 'in_progress' | 'completed',
    priority: 'medium' as 'low' | 'medium' | 'high',
    type: 'blog' as 'blog' | 'tutorial',
    estimatedWordCount: 1000,
    targetKeywords: [] as string[],
    category: '',
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [error, setError] = useState('');

  // Populate form when article changes
  useEffect(() => {
    if (article && open) {
      setFormData({
        title: article.title,
        description: article.description,
        targetMonth: article.targetMonth,
        status: article.status,
        priority: article.priority,
        type: article.type || 'blog', // Default to blog if not set
        estimatedWordCount: article.estimatedWordCount,
        targetKeywords: [...article.targetKeywords],
        category: article.category,
      });
    }
  }, [article, open]);

  // Get next 12 months for dropdown
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  const categories = [
    'Blog Post',
    'Case Study',
    'How-to Guide',
    'Industry Analysis',
    'Product Review',
    'News & Updates',
    'Interview',
    'Whitepaper',
    'Infographic',
    'Video Script',
    'Social Media',
    'Email Newsletter'
  ];

  const contentTypes = [
    { value: 'blog', label: 'Blog Post' },
    { value: 'tutorial', label: 'Tutorial' },
  ];

  const handleChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
  };

  const addKeyword = (keyword: string) => {
    if (keyword && !formData.targetKeywords.includes(keyword)) {
      setFormData(prev => ({
        ...prev,
        targetKeywords: [...prev.targetKeywords, keyword]
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      targetKeywords: prev.targetKeywords.filter(k => k !== keywordToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Please enter an article title');
      return;
    }

    if (!formData.category) {
      setError('Please select a category');
      return;
    }

    if (!article) return;

    onSubmit({
      ...article,
      ...formData,
    });
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      targetMonth: '',
      status: 'idea',
      priority: 'medium',
      type: 'blog',
      estimatedWordCount: 1000,
      targetKeywords: [],
      category: '',
    });
    setKeywordInput('');
    setError('');
    onClose();
  };

  if (!article) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Article Idea for {clientName}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Article Title *"
                  value={formData.title}
                  onChange={handleChange('title')}
                  required
                  placeholder="Enter a compelling article title"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={handleChange('description')}
                  placeholder="Brief description of the article content and objectives"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    label="Category"
                    onChange={handleChange('category')}
                  >
                    {categories.map(category => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Content Type</InputLabel>
                  <Select
                    value={formData.type}
                    label="Content Type"
                    onChange={handleChange('type')}
                  >
                    {contentTypes.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Target Month</InputLabel>
                  <Select
                    value={formData.targetMonth}
                    label="Target Month"
                    onChange={handleChange('targetMonth')}
                  >
                    <MenuItem value="">
                      <em>Unscheduled</em>
                    </MenuItem>
                    {getMonthOptions().map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={handleChange('status')}
                  >
                    <MenuItem value="idea">Idea</MenuItem>
                    <MenuItem value="assigned">Assigned</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority}
                    label="Priority"
                    onChange={handleChange('priority')}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Estimated Word Count"
                  type="number"
                  value={formData.estimatedWordCount}
                  onChange={handleChange('estimatedWordCount')}
                  inputProps={{ min: 100, max: 10000 }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Target Keywords
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {formData.targetKeywords.map((keyword, idx) => (
                    <Chip
                      key={idx}
                      label={keyword}
                      onDelete={() => removeKeyword(keyword)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="Add target keyword..."
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyword(keywordInput);
                      }
                    }}
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    onClick={() => addKeyword(keywordInput)}
                    disabled={!keywordInput.trim()}
                    startIcon={<AddIcon />}
                  >
                    Add
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Press Enter or click Add to include keywords. These help with SEO planning.
                </Typography>
              </Grid>

              {/* Show additional info if article has been assigned */}
              {article.taskId && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="info">
                    This article idea has been converted to a task and is now being tracked in the project management system.
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={!formData.title.trim() || !formData.category}
          >
            Update Article Idea
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditArticleIdeaModal;