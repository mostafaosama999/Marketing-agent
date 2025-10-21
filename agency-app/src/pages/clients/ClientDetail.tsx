// src/pages/clients/ClientDetail.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Avatar,
  Divider,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  MoreVert as MoreVertIcon,
  Rule as GuidelinesIcon,
  Article as ArticleIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { useClient } from '../../hooks/useClients';
import { useArticleIdeas } from '../../hooks/useArticleIdeas';
import { ArticleIdea } from '../../types';
import AddArticleIdeaModal from '../../components/forms/AddArticleIdeaModal';
import EditArticleIdeaModal from '../../components/forms/EditArticleIdeaModal';
import ClientGuidelinesModal from '../../components/forms/ClientGuidelinesModal';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} style={{ width: '100%' }}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Component to render formatted text with proper HTML rendering
const FormattedText: React.FC<{ text: string | undefined; variant?: any; sx?: any }> = ({ 
  text, 
  variant = 'body1', 
  sx = {} 
}) => {
  if (!text) {
    return (
      <Typography variant={variant} sx={{ color: 'text.secondary', fontStyle: 'italic', ...sx }}>
        Not provided
      </Typography>
    );
  }

  // Check if content appears to be HTML
  const isHTML = text.includes('<') && text.includes('>');

  if (isHTML) {
    return (
      <Box 
        sx={{
          '& h1': {
            fontSize: '1.5rem',
            fontWeight: 600,
            margin: '16px 0 12px 0',
            lineHeight: 1.3,
            color: 'text.primary',
          },
          '& h2': {
            fontSize: '1.25rem',
            fontWeight: 600,
            margin: '14px 0 10px 0',
            lineHeight: 1.3,
            color: 'text.primary',
          },
          '& h3': {
            fontSize: '1.125rem',
            fontWeight: 600,
            margin: '12px 0 8px 0',
            lineHeight: 1.3,
            color: 'text.primary',
          },
          '& h4': {
            fontSize: '1rem',
            fontWeight: 600,
            margin: '10px 0 6px 0',
            lineHeight: 1.3,
            color: 'text.primary',
          },
          '& p': {
            fontSize: '0.875rem',
            margin: '8px 0',
            lineHeight: 1.6,
            color: 'text.primary',
          },
          '& ul, & ol': {
            margin: '12px 0',
            paddingLeft: '24px',
          },
          '& li': {
            fontSize: '0.875rem',
            margin: '4px 0',
            lineHeight: 1.5,
            color: 'text.primary',
          },
          '& blockquote': {
            borderLeft: '4px solid',
            borderLeftColor: 'divider',
            padding: '12px 16px',
            margin: '16px 0',
            fontStyle: 'italic',
            color: 'text.secondary',
            backgroundColor: 'grey.50',
            borderRadius: '0 4px 4px 0',
            fontSize: '0.875rem',
          },
          '& strong': {
            fontWeight: 600,
          },
          '& em': {
            fontStyle: 'italic',
          },
          '& u': {
            textDecoration: 'underline',
          },
          ...sx
        }}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  // Handle plain text with line breaks
  return (
    <Box sx={sx}>
      {text.split('\n').map((line, index) => (
        <Typography
          key={index}
          variant={variant}
          sx={{
            mb: line.trim() === '' ? 1.5 : 0.5,
            minHeight: line.trim() === '' ? '1em' : 'auto',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            fontSize: '0.875rem',
          }}
        >
          {line || '\u00A0'}
        </Typography>
      ))}
    </Box>
  );
};

const ClientDetail: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  // Custom hooks
  const { client, loading: clientLoading, updateGuidelines, guidelines } = useClient(clientId!);
  const { 
    articleIdeas, 
    addArticleIdea,
    editArticleIdea,
    deleteArticleIdea,
    convertToTicket,
    groupArticlesByMonth
  } = useArticleIdeas(clientId!);

  // State
  const [tabValue, setTabValue] = useState(0);
  const [openArticleModal, setOpenArticleModal] = useState(false);
  const [openEditArticleModal, setOpenEditArticleModal] = useState(false);
  const [openGuidelinesModal, setOpenGuidelinesModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<ArticleIdea | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuArticle, setMenuArticle] = useState<ArticleIdea | null>(null);

  // Role-based permissions
  const isCEO = userProfile?.role === 'CEO';
  const isManager = userProfile?.role === 'Manager';

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, article: ArticleIdea) => {
    setAnchorEl(event.currentTarget);
    setMenuArticle(article);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuArticle(null);
  };

  const handleConvertToTask = async (article: ArticleIdea) => {
    try {
      await convertToTicket(article, client?.name || '');
    } catch (error) {
      console.error('Error converting article idea to task:', error);
    }
    handleMenuClose();
  };

  // Handle guidelines submission
  const handleGuidelinesSubmit = async (guidelines: any) => {
    if (clientId) {
      await updateGuidelines(clientId, guidelines);
      setOpenGuidelinesModal(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'assigned': return 'warning';
      case 'idea': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#64748b';
    }
  };

  const getMonthName = (monthKey: string) => {
    if (monthKey === 'unscheduled') return 'Unscheduled';
    const [year, month] = monthKey.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  if (clientLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Typography variant="h6">Loading client details...</Typography>
      </Box>
    );
  }

  if (!client) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Client not found</Alert>
      </Box>
    );
  }

  const groupedArticles = groupArticlesByMonth();
  const sortedMonths = Object.keys(groupedArticles).sort((a, b) => {
    if (a === 'unscheduled') return 1;
    if (b === 'unscheduled') return -1;
    return a.localeCompare(b);
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
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
          {client.name.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: '1.75rem' }}>
            {client.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Chip
              label={client.status}
              size="small"
              sx={{
                background: client.status === 'active' 
                  ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                  : client.status === 'prospect'
                  ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)'
                  : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                color: client.status === 'active' 
                  ? '#15803d' 
                  : client.status === 'prospect'
                  ? '#1d4ed8'
                  : '#475569',
                fontWeight: 600,
                textTransform: 'capitalize',
                borderRadius: 2,
                fontSize: '0.75rem',
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              {client.industry}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenArticleModal(true)}
          sx={{ mr: 2, fontSize: '0.875rem' }}
        >
          Add Article Idea
        </Button>
        <Button
          variant="outlined"
          startIcon={<GuidelinesIcon />}
          onClick={() => setOpenGuidelinesModal(true)}
          sx={{ fontSize: '0.875rem' }}
        >
          {guidelines ? 'Edit Guidelines' : 'Add Guidelines'}
        </Button>
      </Box>

      {/* Client Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ArticleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="primary.main" sx={{ fontSize: '2rem' }}>
                {articleIdeas.length}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Article Ideas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="warning.main" sx={{ fontSize: '2rem' }}>
                {articleIdeas.filter(a => a.status === 'assigned' || a.status === 'in_progress').length}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue Card - Only show to CEO */}
        {isCEO && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <MoneyIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h3" fontWeight="bold" color="success.main" sx={{ fontSize: '2rem' }}>
                  ${client.monthlyRevenue?.toLocaleString() || 0}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  Monthly Revenue
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="info.main" sx={{ fontSize: '2rem' }}>
                {articleIdeas.filter(a => a.status === 'completed').length}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label="Content Calendar" 
            icon={<CalendarIcon />} 
            iconPosition="start" 
            sx={{ fontSize: '0.875rem' }}
          />
          <Tab 
            label="Client Guidelines" 
            icon={<GuidelinesIcon />} 
            iconPosition="start" 
            sx={{ fontSize: '0.875rem' }}
          />
          <Tab 
            label="Client Details" 
            icon={<BusinessIcon />} 
            iconPosition="start" 
            sx={{ fontSize: '0.875rem' }}
          />
        </Tabs>

        {/* Content Calendar Tab */}
        <TabPanel value={tabValue} index={0}>
          {sortedMonths.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {sortedMonths.map(monthKey => (
                <Card key={monthKey} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.125rem' }}>
                        {getMonthName(monthKey)}
                      </Typography>
                      <Chip
                        label={`${groupedArticles[monthKey].length} articles`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    </Box>
                    
                    <List>
                      {groupedArticles[monthKey].map((article, index) => (
                        <React.Fragment key={article.id}>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                                    {article.title}
                                  </Typography>
                                  <Chip
                                    label={article.status.replace('_', ' ')}
                                    size="small"
                                    color={getStatusColor(article.status) as any}
                                    sx={{ textTransform: 'capitalize', fontSize: '0.75rem' }}
                                  />
                                  <Box
                                    sx={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      backgroundColor: getPriorityColor(article.priority),
                                    }}
                                  />
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.875rem' }}>
                                    {article.description}
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                      Category: {article.category}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                      Words: {article.estimatedWordCount}
                                    </Typography>
                                    {article.targetKeywords.length > 0 && (
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                        Keywords: {article.targetKeywords.slice(0, 3).join(', ')}
                                        {article.targetKeywords.length > 3 && '...'}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                onClick={(e) => handleMenuClick(e, article)}
                                size="small"
                              >
                                <MoreVertIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                          {index < groupedArticles[monthKey].length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ArticleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: '1.125rem' }}>
                No article ideas yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: '0.875rem' }}>
                Start building your content calendar by adding article ideas
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenArticleModal(true)}
                sx={{ fontSize: '0.875rem' }}
              >
                Add First Article Idea
              </Button>
            </Box>
          )}
        </TabPanel>

        {/* Client Guidelines Tab */}
        <TabPanel value={tabValue} index={1}>
          {guidelines ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Check if we have the new sections format */}
              {guidelines.sections && guidelines.sections.length > 0 ? (
                // New section-based display
                guidelines.sections
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((section: any) => (
                    <Card key={section.id}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.125rem' }}>
                            {section.title}
                          </Typography>
                          {section.type === 'checklist' && (
                            <Chip 
                              label="CHECKLIST" 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          )}
                        </Box>
                        
                        {section.type === 'checklist' && section.checklistItems ? (
                          <List sx={{ py: 0 }}>
                            {section.checklistItems
                              .sort((a: any, b: any) => a.order - b.order)
                              .map((item: any) => (
                                <ListItem key={item.id} sx={{ px: 0, py: 1.5 }}>
                                  <Box sx={{ 
                                    width: 8, 
                                    height: 8, 
                                    borderRadius: '50%', 
                                    bgcolor: 'primary.main',
                                    mr: 2,
                                    mt: 0.5,
                                    flexShrink: 0
                                  }} />
                                  <ListItemText 
                                    primary={
                                      <Typography variant="body1" sx={{ 
                                        fontSize: '0.875rem', 
                                        lineHeight: 1.6,
                                        color: 'text.primary',
                                        margin: 0
                                      }}>
                                        {item.text}
                                      </Typography>
                                    }
                                  />
                                </ListItem>
                              ))}
                          </List>
                        ) : (
                          <Box 
                            sx={{ 
                              '& h1': { 
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                marginBottom: 2,
                                marginTop: 3,
                                lineHeight: 1.3,
                                color: 'text.primary',
                              },
                              '& h2': { 
                                fontSize: '1.25rem',
                                fontWeight: 600,
                                marginBottom: 1.5,
                                marginTop: 2.5,
                                lineHeight: 1.3,
                                color: 'text.primary',
                              },
                              '& h3': { 
                                fontSize: '1.125rem',
                                fontWeight: 600,
                                marginBottom: 1,
                                marginTop: 2,
                                lineHeight: 1.3,
                                color: 'text.primary',
                              },
                              '& p': { 
                                fontSize: '0.875rem',
                                marginBottom: 1.5,
                                lineHeight: 1.6,
                                color: 'text.primary',
                              },
                              '& ul, & ol': { 
                                paddingLeft: 3, 
                                marginBottom: 1.5,
                                marginTop: 1,
                              },
                              '& li': { 
                                fontSize: '0.875rem',
                                marginBottom: 0.5,
                                lineHeight: 1.5,
                                color: 'text.primary',
                              },
                              '& strong': { fontWeight: 600 },
                            }}
                            dangerouslySetInnerHTML={{ __html: section.content }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  ))
              ) : (
                // Legacy format display
                <>
                  {guidelines.brandVoice && (
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: '1.125rem' }}>
                          Brand Voice & Style
                        </Typography>
                        <FormattedText 
                          text={guidelines.brandVoice} 
                          variant="body1" 
                          sx={{ mb: 2 }} 
                        />
                        {guidelines.contentStyle && (
                          <>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ fontSize: '1rem' }}>
                              Content Style
                            </Typography>
                            <FormattedText 
                              text={guidelines.contentStyle} 
                              variant="body2" 
                              sx={{ color: 'text.secondary' }} 
                            />
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {guidelines.targetAudience && (
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: '1.125rem' }}>
                          Target Audience
                        </Typography>
                        <FormattedText 
                          text={guidelines.targetAudience} 
                          variant="body1" 
                        />
                      </CardContent>
                    </Card>
                  )}

                  {guidelines.keyMessages && guidelines.keyMessages.length > 0 && (
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: '1.125rem' }}>
                          Key Messages
                        </Typography>
                        <List dense>
                          {guidelines.keyMessages.map((message: string, index: number) => (
                            <ListItem key={index} sx={{ px: 0 }}>
                              <ListItemText 
                                primary={<FormattedText text={message} variant="body1" />} 
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  )}

                  {guidelines.seoKeywords && guidelines.seoKeywords.length > 0 && (
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: '1.125rem' }}>
                          SEO Keywords
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {guidelines.seoKeywords.map((keyword: string, index: number) => (
                            <Chip 
                              key={index} 
                              label={keyword} 
                              size="small" 
                              variant="outlined" 
                              sx={{ fontSize: '0.75rem' }}
                            />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  )}

                  {guidelines.avoidTopics && guidelines.avoidTopics.length > 0 && (
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: '1.125rem' }}>
                          Topics to Avoid
                        </Typography>
                        <List dense>
                          {guidelines.avoidTopics.map((topic: string, index: number) => (
                            <ListItem key={index} sx={{ px: 0 }}>
                              <ListItemText 
                                primary={
                                  <FormattedText 
                                    text={topic} 
                                    variant="body1" 
                                    sx={{ color: 'error.main' }} 
                                  />
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  )}

                  {guidelines.competitorAnalysis && (
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: '1.125rem' }}>
                          Competitor Analysis
                        </Typography>
                        <FormattedText 
                          text={guidelines.competitorAnalysis} 
                          variant="body1" 
                        />
                      </CardContent>
                    </Card>
                  )}

                  {guidelines.content && !guidelines.sections && (
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: '1.125rem' }}>
                          Content Guidelines
                        </Typography>
                        <FormattedText 
                          text={guidelines.content} 
                          variant="body1" 
                        />
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <GuidelinesIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: '1.125rem' }}>
                No content guidelines set
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: '0.875rem' }}>
                Add guidelines to help writers and reviewers maintain consistency
              </Typography>
              <Button
                variant="contained"
                startIcon={<GuidelinesIcon />}
                onClick={() => setOpenGuidelinesModal(true)}
                sx={{ fontSize: '0.875rem' }}
              >
                Add Guidelines
              </Button>
            </Box>
          )}
        </TabPanel>

        {/* Client Details Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: '1.125rem' }}>
                    Contact Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Email
                      </Typography>
                      <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>
                        {client.contactEmail || 'Not provided'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Phone
                      </Typography>
                      <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>
                        {client.contactPhone || 'Not provided'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Website
                      </Typography>
                      <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>
                        {client.website || 'Not provided'}
                      </Typography>
                    </Box>
                    {client.address && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          Address
                        </Typography>
                        <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>
                          {client.address}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Contract Details - Only show to CEO */}
            {isCEO && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: '1.125rem' }}>
                      Contract Details
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          Contract Value
                        </Typography>
                        <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>
                          ${client.contractValue?.toLocaleString() || 0}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          Monthly Revenue
                        </Typography>
                        <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>
                          ${client.monthlyRevenue?.toLocaleString() || 0}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          Start Date
                        </Typography>
                        <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>
                          {client.startDate ? new Date(client.startDate).toLocaleDateString() : 'Not set'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {client.notes && (
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: '1.125rem' }}>
                      Notes
                    </Typography>
                    <FormattedText 
                      text={client.notes} 
                      variant="body1" 
                    />
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>
      </Paper>

      {/* Article Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          setSelectedArticle(menuArticle);
          setOpenEditArticleModal(true);
          handleMenuClose();
        }}>
          <EditIcon sx={{ mr: 2 }} />
          <Typography sx={{ fontSize: '0.875rem' }}>Edit Idea</Typography>
        </MenuItem>
        {menuArticle?.status === 'idea' && (
          <MenuItem onClick={() => handleConvertToTask(menuArticle!)}>
            <AssignmentIcon sx={{ mr: 2 }} />
            <Typography sx={{ fontSize: '0.875rem' }}>Convert to Task</Typography>
          </MenuItem>
        )}
        <MenuItem 
          onClick={() => deleteArticleIdea(menuArticle!.id)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 2 }} />
          <Typography sx={{ fontSize: '0.875rem' }}>Delete Idea</Typography>
        </MenuItem>
      </Menu>

      {/* Modals */}
      <AddArticleIdeaModal
        open={openArticleModal}
        onClose={() => setOpenArticleModal(false)}
        onSubmit={addArticleIdea}
        clientName={client.name}
      />

      <EditArticleIdeaModal
        open={openEditArticleModal}
        onClose={() => {
          setOpenEditArticleModal(false);
          setSelectedArticle(null);
        }}
        onSubmit={editArticleIdea}
        article={selectedArticle}
        clientName={client.name}
      />

      <ClientGuidelinesModal
        open={openGuidelinesModal}
        onClose={() => setOpenGuidelinesModal(false)}
        onSubmit={handleGuidelinesSubmit}
        guidelines={guidelines}
        clientName={client.name}
      />
    </Box>
  );
};

export default ClientDetail;