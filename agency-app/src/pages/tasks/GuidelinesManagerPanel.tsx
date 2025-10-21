// src/pages/tasks/GuidelinesManagerPanel.tsx - Fixed Scrolling and Layout
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Checkbox,
  LinearProgress,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RateReview as ManagerReviewIcon,
  ChecklistRtl as ChecklistIcon,
  MenuBook as GuidelinesIcon,
  ExpandMore,
  UnfoldMore,
  UnfoldLess,
  Rule as RuleIcon,
} from '@mui/icons-material';
import { GuidelineSection } from '../../types/client';

interface GuidelinesManagerPanelProps {
  task: any;
  clientGuidelines: any;
  loadingGuidelines: boolean;
  guidelinesChecklist: { [key: string]: boolean };
  managerScore: string;
  managerFeedback: string;
  hasManagerReview: boolean;
  onGuidelineCheck: (key: string, checked: boolean) => void;
  onScoreChange: (score: string) => void;
  onFeedbackChange: (feedback: string) => void;
  onSaveReview: () => void;
}

function TabPanel(props: { children?: React.ReactNode; value: number; index: number }) {
  const { children, value, index } = props;
  return (
    <div hidden={value !== index} style={{ width: '100%', height: '100%' }}>
      {value === index && <Box sx={{ height: '100%', py: 1, overflow: 'auto' }}>{children}</Box>}
    </div>
  );
}

const GuidelinesManagerPanel: React.FC<GuidelinesManagerPanelProps> = ({
  task,
  clientGuidelines,
  loadingGuidelines,
  guidelinesChecklist,
  managerScore,
  managerFeedback,
  hasManagerReview,
  onGuidelineCheck,
  onScoreChange,
  onFeedbackChange,
  onSaveReview,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedReadingSections, setExpandedReadingSections] = useState<string[]>([]);
  const [expandedChecklistSections, setExpandedChecklistSections] = useState<string[]>([]);
  const [allReadingExpanded, setAllReadingExpanded] = useState(false);
  const [allChecklistExpanded, setAllChecklistExpanded] = useState(false);

  const getChecklistStats = () => {
    if (!clientGuidelines?.sections) return { completed: 0, total: 0, percentage: 0 };
    
    const checklistSections = clientGuidelines.sections.filter((section: GuidelineSection) => 
      section.type === 'checklist' && section.checklistItems && section.checklistItems.length > 0
    );
    
    const total = checklistSections.reduce((sum: number, section: GuidelineSection) => 
      sum + (section.checklistItems?.length || 0), 0
    );
    const completed = Object.values(guidelinesChecklist).filter(Boolean).length;
    const percentage = total > 0 ? (completed / total) * 100 : 100;
    
    return { completed, total, percentage };
  };

  const renderGuidelineContent = (content: string) => {
    return (
      <Box 
        sx={{ 
          '& h1, & h2, & h3': { 
            fontWeight: 600,
            marginBottom: 1,
            fontSize: '0.875rem',
            color: 'text.primary',
          },
          '& p': { 
            fontSize: '0.75rem',
            marginBottom: 1,
            lineHeight: 1.4
          },
          '& ul, & ol': { 
            paddingLeft: 2,
            marginBottom: 1,
            '& li': { 
              fontSize: '0.75rem',
              marginBottom: 0.25,
              lineHeight: 1.3
            }
          },
          '& strong': { fontWeight: 600 },
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };

  // Toggle functions for Reading tab
  const toggleReadingSection = (sectionId: string) => {
    setExpandedReadingSections(prev => {
      const newExpanded = prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];
      
      const readingSections = clientGuidelines?.sections?.filter((section: GuidelineSection) => 
        section.type === 'freeform' && section.content && section.content.trim()
      ) || [];
      setAllReadingExpanded(readingSections.every((section: GuidelineSection) => newExpanded.includes(section.id)));
      
      return newExpanded;
    });
  };

  const toggleAllReading = () => {
    const readingSections = clientGuidelines?.sections?.filter((section: GuidelineSection) => 
      section.type === 'freeform' && section.content && section.content.trim()
    ) || [];

    if (allReadingExpanded) {
      setExpandedReadingSections([]);
      setAllReadingExpanded(false);
    } else {
      setExpandedReadingSections(readingSections.map((section: GuidelineSection) => section.id));
      setAllReadingExpanded(true);
    }
  };

  // Toggle functions for Checklist tab
  const toggleChecklistSection = (sectionId: string) => {
    setExpandedChecklistSections(prev => {
      const newExpanded = prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];
      
      const checklistSections = clientGuidelines?.sections?.filter((section: GuidelineSection) => 
        section.type === 'checklist' && section.checklistItems && section.checklistItems.length > 0
      ) || [];
      setAllChecklistExpanded(checklistSections.every((section: GuidelineSection) => newExpanded.includes(section.id)));
      
      return newExpanded;
    });
  };

  const toggleAllChecklist = () => {
    const checklistSections = clientGuidelines?.sections?.filter((section: GuidelineSection) => 
      section.type === 'checklist' && section.checklistItems && section.checklistItems.length > 0
    ) || [];

    if (allChecklistExpanded) {
      setExpandedChecklistSections([]);
      setAllChecklistExpanded(false);
    } else {
      setExpandedChecklistSections(checklistSections.map((section: GuidelineSection) => section.id));
      setAllChecklistExpanded(true);
    }
  };

  const checklistStats = getChecklistStats();
  const readingSections = clientGuidelines?.sections?.filter((section: GuidelineSection) => 
    section.type === 'freeform' && section.content && section.content.trim()
  ) || [];
  
  const checklistSections = clientGuidelines?.sections?.filter((section: GuidelineSection) => 
    section.type === 'checklist' && section.checklistItems && section.checklistItems.length > 0
  ) || [];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Guidelines Checklist Summary - Fixed height */}
      <Card sx={{ flex: '0 0 auto', mb: 1.5 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1rem' }}>
              Guidelines Overview
            </Typography>
            <Chip
              label={`${checklistStats.completed}/${checklistStats.total}`}
              color={checklistStats.percentage === 100 ? 'success' : 'primary'}
              size="small"
              sx={{ fontSize: '0.75rem' }}
            />
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={checklistStats.percentage}
            sx={{ height: 8, borderRadius: 4, mb: 1 }}
          />
          <Typography variant="caption" sx={{ fontSize: '0.7rem', textAlign: 'center', display: 'block' }}>
            {checklistStats.percentage.toFixed(0)}% complete
          </Typography>
        </CardContent>
      </Card>

      {/* Scrollable Container for the rest */}
      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        
        {/* Tabbed Guidelines - Flexible height */}
        <Card sx={{ flex: '0 0 auto', minHeight: '300px', maxHeight: '400px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
          >
            <Tab 
              icon={<GuidelinesIcon />} 
              label="Read" 
              iconPosition="start"
              sx={{ fontSize: '0.75rem', minHeight: 40 }}
            />
            <Tab 
              icon={<ChecklistIcon />} 
              label="Check" 
              iconPosition="start"
              sx={{ fontSize: '0.75rem', minHeight: 40 }}
            />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <Box sx={{ height: '100%', overflow: 'auto', p: 1 }}>
              {loadingGuidelines ? (
                <Typography variant="body2" sx={{ textAlign: 'center', p: 2 }}>Loading...</Typography>
              ) : readingSections.length === 0 ? (
                <Alert severity="info">
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                    No reading guidelines for {task.clientName}
                  </Typography>
                </Alert>
              ) : (
                <Box>
                  {/* Expand/Collapse All for Reading */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      Content Guidelines ({readingSections.length})
                    </Typography>
                    <Tooltip title={allReadingExpanded ? "Collapse All" : "Expand All"}>
                      <IconButton onClick={toggleAllReading} size="small">
                        {allReadingExpanded ? <UnfoldLess /> : <UnfoldMore />}
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {readingSections
                    .sort((a: GuidelineSection, b: GuidelineSection) => a.order - b.order)
                    .map((section: GuidelineSection) => (
                      <Accordion
                        key={section.id}
                        expanded={expandedReadingSections.includes(section.id)}
                        onChange={() => toggleReadingSection(section.id)}
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
                              gap: 1,
                            }
                          }}
                        >
                          <RuleIcon sx={{ color: 'primary.main', fontSize: '1rem' }} />
                          <Typography variant="subtitle2" fontWeight="600" sx={{ fontSize: '0.8rem' }}>
                            {section.title}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 1, pb: 2 }}>
                          {renderGuidelineContent(section.content)}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                </Box>
              )}
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Box sx={{ height: '100%', overflow: 'auto', p: 1 }}>
              {loadingGuidelines ? (
                <Typography variant="body2" sx={{ textAlign: 'center', p: 2 }}>Loading...</Typography>
              ) : checklistSections.length === 0 ? (
                <Alert severity="info">
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                    No checklist items for {task.clientName}
                  </Typography>
                </Alert>
              ) : (
                <Box>
                  {/* Expand/Collapse All for Checklist */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      Review Checklist ({checklistSections.length})
                    </Typography>
                    <Tooltip title={allChecklistExpanded ? "Collapse All" : "Expand All"}>
                      <IconButton onClick={toggleAllChecklist} size="small">
                        {allChecklistExpanded ? <UnfoldLess /> : <UnfoldMore />}
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {checklistSections
                    .sort((a: GuidelineSection, b: GuidelineSection) => a.order - b.order)
                    .map((section: GuidelineSection) => {
                      const sectionItems = section.checklistItems || [];
                      const sectionCompletedItems = sectionItems.filter(item => 
                        guidelinesChecklist[`${section.id}-${item.id}`] || false
                      ).length;
                      const sectionPercentage = sectionItems.length > 0 ? 
                        (sectionCompletedItems / sectionItems.length) * 100 : 0;

                      return (
                        <Accordion
                          key={section.id}
                          expanded={expandedChecklistSections.includes(section.id)}
                          onChange={() => toggleChecklistSection(section.id)}
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
                              bgcolor: sectionPercentage === 100 ? 'success.lighter' : 'grey.50',
                              '& .MuiAccordionSummary-content': {
                                alignItems: 'center',
                                gap: 1,
                              }
                            }}
                          >
                            <ChecklistIcon sx={{ color: 'primary.main', fontSize: '1rem' }} />
                            <Typography variant="subtitle2" fontWeight="600" sx={{ 
                              flexGrow: 1, 
                              fontSize: '0.8rem' 
                            }}>
                              {section.title}
                            </Typography>
                            <Chip
                              label={`${sectionCompletedItems}/${sectionItems.length}`}
                              color={sectionPercentage === 100 ? 'success' : 'default'}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', mr: 1 }}
                            />
                          </AccordionSummary>
                          
                          <AccordionDetails sx={{ pt: 1, pb: 2 }}>
                            <List dense sx={{ py: 0 }}>
                              {sectionItems
                                .sort((a, b) => a.order - b.order)
                                .map(item => {
                                  const itemKey = `${section.id}-${item.id}`;
                                  const isChecked = guidelinesChecklist[itemKey] || false;
                                  
                                  return (
                                    <ListItem key={item.id} sx={{ px: 0, py: 0.25 }}>
                                      <Checkbox
                                        checked={isChecked}
                                        onChange={(e) => onGuidelineCheck(itemKey, e.target.checked)}
                                        size="small"
                                        sx={{ py: 0, px: 0.5 }}
                                      />
                                      <ListItemText
                                        primary={
                                          <Typography 
                                            variant="body2"
                                            sx={{
                                              fontSize: '0.7rem',
                                              textDecoration: isChecked ? 'line-through' : 'none',
                                              color: isChecked ? 'text.secondary' : 'text.primary',
                                              lineHeight: 1.3
                                            }}
                                          >
                                            {item.text}
                                          </Typography>
                                        }
                                      />
                                    </ListItem>
                                  );
                                })}
                            </List>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                </Box>
              )}
            </Box>
          </TabPanel>
        </Card>

        {/* Manager Review - Fixed height, always visible */}
        <Card sx={{ flex: '0 0 auto', minHeight: '280px' }}>
          <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ManagerReviewIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1rem' }}>
                Manager Review
              </Typography>
              {hasManagerReview && (
                <Chip label="Completed" color="success" size="small" sx={{ fontSize: '0.75rem' }} />
              )}
            </Box>
            
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                label="Score (1-10)"
                type="number"
                size="small"
                value={managerScore}
                onChange={(e) => onScoreChange(e.target.value)}
                inputProps={{ min: 1, max: 10 }}
                placeholder="Rate the content quality"
                sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem', textAlign: 'center' } }}
              />
              
              <TextField
                label="Manager Feedback"
                multiline
                rows={3}
                size="small"
                value={managerFeedback}
                onChange={(e) => onFeedbackChange(e.target.value)}
                placeholder="Provide constructive feedback for the writer..."
                sx={{ 
                  '& .MuiInputBase-input': { fontSize: '0.875rem' } 
                }}
              />
              
              {/* Save Review Score Button */}
              {task.status !== 'done' && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={onSaveReview}
                    size="small"
                    fullWidth
                    startIcon={<CheckCircleIcon />}
                    sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                    disabled={!managerScore || parseInt(managerScore) < 1 || parseInt(managerScore) > 10}
                  >
                    SAVE REVIEW SCORE
                  </Button>
                </Box>
              )}
              
              {/* Instructions for new workflow */}
              {task.status !== 'done' && (
                <Alert severity="info" sx={{ mt: 1, fontSize: '0.75rem' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                    💡 After saving your score, use the kanban board to move the task to the next stage (drag & drop).
                  </Typography>
                </Alert>
              )}

              {/* Show completion message if task is done */}
              {task.status === 'done' && (
                <Alert severity="success">
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                    Task completed and approved!
                  </Typography>
                </Alert>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default GuidelinesManagerPanel;