// src/pages/tasks/AIAnalysisDashboard.tsx - Auto-Height Scrolling Fix
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  ContentCopy,
  Refresh,
  LocationOn,
  Comment as CommentIcon,
  Lightbulb as SuggestionIcon,
} from '@mui/icons-material';

interface AIAnalysisDashboardProps {
  task: any;
  aiReview: any;
  reviewing: boolean;
  onAIReview: () => void;
}

interface CategoryData {
  name: string;
  score: string;
  icon: string;
  color: string;
}

const AIAnalysisDashboard: React.FC<AIAnalysisDashboardProps> = ({
  task,
  aiReview,
  reviewing,
  onAIReview,
}) => {
  const getCategoryData = (categoryName: string, score: string): CategoryData => {
    const categories: { [key: string]: Omit<CategoryData, 'name' | 'score'> } = {
      'Clarity and Structure': { icon: '📝', color: '#4285f4' },
      'Technical Depth': { icon: '🔬', color: '#9c27b0' },
      'Accuracy': { icon: '✓', color: '#ea4335' },
      'Originality and Value': { icon: '💡', color: '#34a853' },
      'Practical Usefulness': { icon: '🛠️', color: '#fbbc04' },
      'Completeness': { icon: '📋', color: '#00acc1' },
      'Links, SEO and Images': { icon: '🔗', color: '#5f6368' },
      'clarity_and_structure': { icon: '📝', color: '#4285f4' },
      'technical_depth': { icon: '🔬', color: '#9c27b0' },
      'accuracy': { icon: '✓', color: '#ea4335' },
      'originality_and_value': { icon: '💡', color: '#34a853' },
      'practical_usefulness': { icon: '🛠️', color: '#fbbc04' },
      'completeness': { icon: '📋', color: '#00acc1' },
      'links_seo_and_images': { icon: '🔗', color: '#5f6368' }
    };
    return {
      name: categoryName,
      score,
      ...categories[categoryName] || { icon: '📊', color: '#5f6368' }
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#4caf50';
    if (score >= 70) return '#ff9800';
    return '#f44336';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(err => console.error('Copy failed:', err));
  };

  if (!task.content) {
    return (
      <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h6" sx={{ fontSize: '1.125rem', mb: 2 }}>
            No Content to Review
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            Add content to begin the review process
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!aiReview) {
    return (
      <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          <AIIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" sx={{ fontSize: '1.125rem', mb: 2 }}>
            Ready for AI Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', mb: 3 }}>
            Run AI analysis to get detailed feedback
          </Typography>
          <Button
            variant="contained"
            onClick={onAIReview}
            disabled={reviewing}
            size="large"
            startIcon={<AIIcon />}
          >
            {reviewing ? 'Analyzing...' : 'Start AI Analysis'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ p: 2 }}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1.125rem' }}>
              AI Analysis Results
            </Typography>
          </Box>
          <Tooltip title="Re-analyze">
            <IconButton onClick={onAIReview} size="small" disabled={reviewing}>
              <Refresh sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Overall Score Banner */}
        <Card sx={{ mb: 2, bgcolor: getScoreColor(aiReview.overallScore), color: 'white' }}>
          <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
            <Typography variant="h3" fontWeight="bold" sx={{ fontSize: '2rem' }}>
              {aiReview.overallScore}/100
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.875rem', opacity: 0.9 }}>
              Overall Content Score
            </Typography>
          </CardContent>
        </Card>

        {/* Two Column Layout - No height restrictions */}
        <Grid container spacing={1}>
          
          {/* Categories - Left Column */}
          <Grid size={6}>
            <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ fontSize: '0.875rem', mb: 1 }}>
                Category Scores
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {Object.entries(aiReview.categories || {}).map(([name, score]) => {
                  const categoryData = getCategoryData(name, String(score));
                  const displayName = name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
                  
                  return (
                    <Box
                      key={name}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1,
                        borderRadius: 1,
                        bgcolor: `${categoryData.color}15`,
                        border: `1px solid ${categoryData.color}30`
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '0.75rem' }}>
                          {categoryData.icon}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>
                          {displayName}
                        </Typography>
                      </Box>
                      <Typography 
                        variant="subtitle2" 
                        fontWeight="bold" 
                        sx={{ color: categoryData.color, fontSize: '0.75rem' }}
                      >
                        {String(score)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Grid>

          {/* Feedback - Right Column */}
          <Grid size={6}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="600" sx={{ fontSize: '0.875rem' }}>
                  Detailed Feedback
                </Typography>
                <Chip 
                  label={`${(aiReview.suggestions || []).length} items`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
              
              {/* Simple scrollable feedback list */}
              <Box sx={{ maxHeight: '400px', overflow: 'auto', pr: 1 }}>
                {(aiReview.suggestions || []).map((comment: any, index: number) => {
                  const location = comment.paragraph || 'No location specified';
                  const content = comment.content || '';
                  const suggestion = comment.suggestion || '';
                  
                  return (
                    <Card 
                      key={index}
                      variant="outlined"
                      sx={{ mb: 2, overflow: 'visible' }}
                    >
                      {/* Header */}
                      <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        bgcolor: 'grey.100',
                        borderBottom: '1px solid #e0e0e0'
                      }}>
                        <Typography variant="subtitle2" sx={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          color: 'primary.main'
                        }}>
                          Feedback #{index + 1}
                        </Typography>
                        <Chip 
                          label={comment.category?.replace(/_/g, ' ') || 'General'}
                          size="small"
                          sx={{ fontSize: '0.65rem', textTransform: 'capitalize' }}
                        />
                      </Box>

                      <CardContent sx={{ p: 1.5 }}>
                        {/* Location */}
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: 1, 
                          mb: 1.5,
                          p: 1,
                          bgcolor: 'info.lighter',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'info.light'
                        }}>
                          <LocationOn sx={{ fontSize: '0.75rem', color: 'info.main', mt: 0.25 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" sx={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 600,
                              color: 'info.main',
                              display: 'block',
                              mb: 0.5
                            }}>
                              LOCATION
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              fontSize: '0.7rem',
                              color: 'text.primary',
                              lineHeight: 1.3
                            }}>
                              {location}
                            </Typography>
                          </Box>
                          <IconButton 
                            size="small" 
                            onClick={() => copyToClipboard(location)}
                            sx={{ p: 0.25 }}
                          >
                            <ContentCopy sx={{ fontSize: '0.6rem' }} />
                          </IconButton>
                        </Box>

                        {/* Comment */}
                        {content && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: 1, 
                            mb: 1.5,
                            p: 1,
                            bgcolor: 'warning.lighter',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'warning.light'
                          }}>
                            <CommentIcon sx={{ fontSize: '0.75rem', color: 'warning.main', mt: 0.25 }} />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="caption" sx={{ 
                                fontSize: '0.65rem', 
                                fontWeight: 600,
                                color: 'warning.main',
                                display: 'block',
                                mb: 0.5
                              }}>
                                COMMENT
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                fontSize: '0.7rem',
                                color: 'text.primary',
                                lineHeight: 1.3
                              }}>
                                {content}
                              </Typography>
                            </Box>
                            <IconButton 
                              size="small" 
                              onClick={() => copyToClipboard(content)}
                              sx={{ p: 0.25 }}
                            >
                              <ContentCopy sx={{ fontSize: '0.6rem' }} />
                            </IconButton>
                          </Box>
                        )}
                        
                        {/* Suggestion */}
                        {suggestion && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: 1,
                            p: 1,
                            bgcolor: 'success.lighter',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'success.light'
                          }}>
                            <SuggestionIcon sx={{ fontSize: '0.75rem', color: 'success.main', mt: 0.25 }} />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="caption" sx={{ 
                                fontSize: '0.65rem', 
                                fontWeight: 600,
                                color: 'success.main',
                                display: 'block',
                                mb: 0.5
                              }}>
                                SUGGESTION
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                fontSize: '0.7rem',
                                color: 'text.primary',
                                lineHeight: 1.3
                              }}>
                                {suggestion}
                              </Typography>
                            </Box>
                            <IconButton 
                              size="small" 
                              onClick={() => copyToClipboard(suggestion)}
                              sx={{ p: 0.25 }}
                            >
                              <ContentCopy sx={{ fontSize: '0.6rem' }} />
                            </IconButton>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default AIAnalysisDashboard;