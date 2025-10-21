// src/pages/tasks/AIReviewCard.tsx - Improved Design
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  AutoAwesome as AIIcon,
  TrendingUp,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  UnfoldMore,
  UnfoldLess,
  ContentCopy,
} from '@mui/icons-material';

interface AIReviewCardProps {
  task: any;
  aiReview: any;
  reviewing: boolean;
  onAIReview: () => void;
  onOpenContentModal: () => void;
}

interface CategoryData {
  name: string;
  score: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const AIReviewCard: React.FC<AIReviewCardProps> = ({
  task,
  aiReview,
  reviewing,
  onAIReview,
  onOpenContentModal,
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['overall-score']);
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleExpanded = (sectionId: string) => {
    setExpandedSections(prev => {
      const newExpanded = prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];
      
      // Update allExpanded state
      const totalSections = ['overall-score', 'category-breakdown', 'feedback', 'suggestions'];
      setAllExpanded(totalSections.every(section => newExpanded.includes(section)));
      
      return newExpanded;
    });
  };

  const toggleExpandAll = () => {
    const totalSections = ['overall-score', 'category-breakdown', 'feedback', 'suggestions'];
    
    if (allExpanded) {
      setExpandedSections(['overall-score']); // Keep overall score expanded
      setAllExpanded(false);
    } else {
      setExpandedSections(totalSections);
      setAllExpanded(true);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return { color: '#4caf50', bg: '#e8f5e8' };
    if (score >= 70) return { color: '#ff9800', bg: '#fff3e0' };
    return { color: '#f44336', bg: '#ffebee' };
  };

  const getCategoryData = (categoryName: string, score: string): CategoryData => {
    const categories: { [key: string]: Omit<CategoryData, 'name' | 'score'> } = {
      'Clarity and Structure': {
        icon: CheckCircle,
        color: '#4285f4',
        bgColor: 'rgba(66, 133, 244, 0.1)'
      },
      'Technical Depth': {
        icon: TrendingUp,
        color: '#9c27b0',
        bgColor: 'rgba(156, 39, 176, 0.1)'
      },
      'Accuracy': {
        icon: CheckCircle,
        color: '#ea4335',
        bgColor: 'rgba(234, 67, 53, 0.1)'
      },
      'Originality and Value': {
        icon: CheckCircle,
        color: '#34a853',
        bgColor: 'rgba(52, 168, 83, 0.1)'
      },
      'Practical Usefulness': {
        icon: CheckCircle,
        color: '#fbbc04',
        bgColor: 'rgba(251, 188, 4, 0.1)'
      },
      'Completeness': {
        icon: CheckCircle,
        color: '#00acc1',
        bgColor: 'rgba(0, 172, 193, 0.1)'
      },
      'Links, SEO and Images': {
        icon: CheckCircle,
        color: '#5f6368',
        bgColor: 'rgba(95, 99, 104, 0.1)'
      }
    };

    return {
      name: categoryName,
      score,
      ...categories[categoryName] || {
        icon: CheckCircle,
        color: '#5f6368',
        bgColor: 'rgba(95, 99, 104, 0.1)'
      }
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  if (!aiReview) {
    return null;
  }

  const scoreData = getScoreColor(aiReview.overallScore);
  const categories = Object.entries(aiReview.categories || {}).map(([name, score]) => 
    getCategoryData(name, score as string)
  );

  return (
    <Box>
      {/* Header with Expand/Collapse All */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AIIcon sx={{ color: 'primary.main', fontSize: '1.5rem' }} />
          <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1.125rem' }}>
            AI Analysis Results
          </Typography>
          <Chip label="Completed" color="success" size="small" sx={{ fontSize: '0.75rem' }} />
        </Box>
        <Tooltip title={allExpanded ? "Collapse All" : "Expand All"}>
          <IconButton onClick={toggleExpandAll} size="small">
            {allExpanded ? <UnfoldLess /> : <UnfoldMore />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Overall Score Section */}
      <Accordion
        expanded={expandedSections.includes('overall-score')}
        onChange={() => toggleExpanded('overall-score')}
        sx={{ 
          mb: 1,
          border: '1px solid #e0e0e0',
          '&:before': { display: 'none' },
          '&.Mui-expanded': {
            margin: '0 0 8px 0',
          }
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{
            bgcolor: scoreData.bg,
            '& .MuiAccordionSummary-content': {
              alignItems: 'center',
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1rem' }}>
              Overall Score
            </Typography>
            <Typography 
              variant="h4" 
              fontWeight="bold" 
              sx={{ 
                fontSize: '1.75rem',
                color: scoreData.color
              }}
            >
              {aiReview.overallScore}/100
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ py: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={aiReview.overallScore}
              sx={{ 
                height: 12,
                borderRadius: 6,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  bgcolor: scoreData.color
                }
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ 
              mt: 1, 
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              {aiReview.overallScore >= 85 ? 'Excellent' : aiReview.overallScore >= 70 ? 'Good' : 'Needs Improvement'}
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Category Breakdown */}
      <Accordion
        expanded={expandedSections.includes('category-breakdown')}
        onChange={() => toggleExpanded('category-breakdown')}
        sx={{ 
          mb: 1,
          border: '1px solid #e0e0e0',
          '&:before': { display: 'none' },
          '&.Mui-expanded': {
            margin: '0 0 8px 0',
          }
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{
            bgcolor: 'grey.50',
            '& .MuiAccordionSummary-content': {
              alignItems: 'center',
            }
          }}
        >
          <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1rem' }}>
            Category Breakdown
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {categories.map((category, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: category.bgColor,
                  border: `1px solid ${category.color}20`
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <category.icon sx={{ color: category.color, fontSize: '1.25rem' }} />
                  <Typography variant="body2" fontWeight="600" sx={{ fontSize: '0.875rem' }}>
                    {category.name}
                  </Typography>
                </Box>
                <Typography 
                  variant="h6" 
                  fontWeight="bold" 
                  sx={{ 
                    color: category.color,
                    fontSize: '1rem'
                  }}
                >
                  {category.score}
                </Typography>
              </Box>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* AI Feedback */}
      <Accordion
        expanded={expandedSections.includes('feedback')}
        onChange={() => toggleExpanded('feedback')}
        sx={{ 
          mb: 1,
          border: '1px solid #e0e0e0',
          '&:before': { display: 'none' },
          '&.Mui-expanded': {
            margin: '0 0 8px 0',
          }
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{
            bgcolor: 'info.lighter',
            '& .MuiAccordionSummary-content': {
              alignItems: 'center',
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon sx={{ color: 'info.main', fontSize: '1.25rem' }} />
            <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1rem' }}>
              AI Feedback
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ position: 'relative' }}>
            <Typography variant="body2" sx={{ 
              fontSize: '0.875rem',
              lineHeight: 1.6,
              color: 'text.primary'
            }}>
              {aiReview.feedback}
            </Typography>
            <IconButton
              size="small"
              onClick={() => copyToClipboard(aiReview.feedback)}
              sx={{ 
                position: 'absolute',
                top: -8,
                right: -8,
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': {
                  bgcolor: 'grey.100'
                }
              }}
            >
              <ContentCopy sx={{ fontSize: '0.875rem' }} />
            </IconButton>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Improvement Suggestions */}
      <Accordion
        expanded={expandedSections.includes('suggestions')}
        onChange={() => toggleExpanded('suggestions')}
        sx={{ 
          mb: 1,
          border: '1px solid #e0e0e0',
          '&:before': { display: 'none' },
          '&.Mui-expanded': {
            margin: '0 0 8px 0',
          }
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{
            bgcolor: 'warning.lighter',
            '& .MuiAccordionSummary-content': {
              alignItems: 'center',
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp sx={{ color: 'warning.main', fontSize: '1.25rem' }} />
            <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1rem' }}>
              Improvement Suggestions
            </Typography>
            <Chip 
              label={`${(aiReview.suggestions || []).length} items`} 
              size="small" 
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(aiReview.suggestions || []).map((suggestion: string, index: number) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'warning.lighter',
                  border: '1px solid',
                  borderColor: 'warning.light',
                  position: 'relative'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: 600,
                      color: 'warning.main',
                      fontSize: '0.75rem',
                      mt: 0.25
                    }}
                  >
                    {index + 1}.
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    color: 'text.primary',
                    flex: 1
                  }}>
                    {suggestion}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(suggestion)}
                    sx={{ 
                      ml: 1,
                      opacity: 0.7,
                      '&:hover': {
                        opacity: 1,
                        bgcolor: 'warning.main',
                        color: 'white'
                      }
                    }}
                  >
                    <ContentCopy sx={{ fontSize: '0.75rem' }} />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Analysis Metadata */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ 
          fontSize: '0.75rem',
          display: 'block',
          textAlign: 'center'
        }}>
          Analysis completed at {new Date().toLocaleString()}
        </Typography>
      </Box>
    </Box>
  );
};

export default AIReviewCard;