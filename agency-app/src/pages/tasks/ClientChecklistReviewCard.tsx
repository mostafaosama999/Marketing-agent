// src/pages/tasks/ClientChecklistReviewCard.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Chip,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore,
  ChecklistRtl as ChecklistIcon,
  CheckCircle,
  UnfoldMore,
  UnfoldLess,
} from '@mui/icons-material';
import { GuidelineSection, ChecklistItem } from '../../types/client';

interface ClientChecklistReviewCardProps {
  clientGuidelines: any;
  clientName: string;
  loadingGuidelines: boolean;
  guidelinesChecklist: { [key: string]: boolean };
  onGuidelineCheck: (guidelineKey: string, checked: boolean) => void;
}

const ClientChecklistReviewCard: React.FC<ClientChecklistReviewCardProps> = ({
  clientGuidelines,
  clientName,
  loadingGuidelines,
  guidelinesChecklist,
  onGuidelineCheck,
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => {
    // Auto-expand all checklist sections by default
    if (clientGuidelines?.sections) {
      const checklistSections = clientGuidelines.sections
        .filter((section: GuidelineSection) => 
          section.type === 'checklist' && section.checklistItems && section.checklistItems.length > 0
        )
        .map((section: GuidelineSection) => section.id);
      setExpandedSections(checklistSections);
      setAllExpanded(checklistSections.length > 0);
    }
  }, [clientGuidelines]);

  const toggleExpanded = (sectionId: string) => {
    setExpandedSections(prev => {
      const newExpanded = prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];
      
      // Update allExpanded state based on current sections
      const checklistSections = clientGuidelines?.sections?.filter((section: GuidelineSection) => 
        section.type === 'checklist' && section.checklistItems && section.checklistItems.length > 0
      ) || [];
      setAllExpanded(checklistSections.every((section: GuidelineSection) => newExpanded.includes(section.id)));
      
      return newExpanded;
    });
  };

  const toggleExpandAll = () => {
    const checklistSections = clientGuidelines?.sections?.filter((section: GuidelineSection) => 
      section.type === 'checklist' && section.checklistItems && section.checklistItems.length > 0
    ) || [];

    if (allExpanded) {
      setExpandedSections([]);
      setAllExpanded(false);
    } else {
      setExpandedSections(checklistSections.map((section: GuidelineSection) => section.id));
      setAllExpanded(true);
    }
  };

  if (loadingGuidelines) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1.125rem' }}>
          Content Review Checklist
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            Loading checklist...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!clientGuidelines) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1.125rem' }}>
          Content Review Checklist
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            No checklist available for {clientName}
          </Typography>
        </Alert>
      </Box>
    );
  }

  const sections = clientGuidelines.sections || [];
  const checklistSections = sections.filter((section: GuidelineSection) => 
    section.type === 'checklist' && section.checklistItems && section.checklistItems.length > 0
  );

  if (checklistSections.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1.125rem' }}>
          Content Review Checklist
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            No checklist items configured for {clientName}
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Calculate completion stats
  const totalChecklistItems = checklistSections.reduce((total: number, section: GuidelineSection) => {
    return total + (section.checklistItems?.length || 0);
  }, 0);

  const completedItems = Object.values(guidelinesChecklist).filter(Boolean).length;
  const completionPercentage = totalChecklistItems > 0 ? (completedItems / totalChecklistItems) * 100 : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1.125rem' }}>
          Content Review Checklist
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`${completedItems}/${totalChecklistItems}`}
            color={completionPercentage === 100 ? 'success' : 'primary'}
            size="small"
            sx={{ fontSize: '0.75rem' }}
            icon={completionPercentage === 100 ? <CheckCircle /> : undefined}
          />
          <Tooltip title={allExpanded ? "Collapse All" : "Expand All"}>
            <IconButton 
              onClick={toggleExpandAll} 
              size="small"
              sx={{ ml: 1 }}
            >
              {allExpanded ? <UnfoldLess /> : <UnfoldMore />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Progress Bar */}
      <Box sx={{ mb: 3 }}>
        <LinearProgress 
          variant="determinate" 
          value={completionPercentage}
          sx={{ 
            height: 8, 
            borderRadius: 4,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              bgcolor: completionPercentage === 100 ? 'success.main' : 'primary.main'
            }
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ 
          mt: 0.5, 
          display: 'block', 
          fontSize: '0.75rem',
          textAlign: 'center'
        }}>
          {completionPercentage.toFixed(0)}% complete
        </Typography>
      </Box>

      {/* Completion Status Alert */}
      {completionPercentage === 100 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            All checklist items completed! Content meets {clientName} guidelines.
          </Typography>
        </Alert>
      )}

      <Box>
        {checklistSections
          .sort((a: GuidelineSection, b: GuidelineSection) => a.order - b.order)
          .map((section: GuidelineSection) => {
            const sectionItems = section.checklistItems || [];
            const sectionCompletedItems = sectionItems.filter((item: ChecklistItem) => 
              guidelinesChecklist[`${section.id}-${item.id}`] || false
            ).length;
            const sectionPercentage = sectionItems.length > 0 ? 
              (sectionCompletedItems / sectionItems.length) * 100 : 0;

            return (
              <Accordion
                key={section.id}
                expanded={expandedSections.includes(section.id)}
                onChange={() => toggleExpanded(section.id)}
                sx={{ 
                  mb: 1,
                  border: '1px solid #e0e0e0',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': {
                    margin: '0 0 8px 0',
                  },
                  '&:last-child': {
                    mb: 0,
                  }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      alignItems: 'center',
                      gap: 1,
                    },
                    bgcolor: sectionPercentage === 100 ? 'success.lighter' : 'grey.50',
                  }}
                >
                  <ChecklistIcon sx={{ color: 'primary.main', mr: 1, fontSize: '1.125rem' }} />
                  <Typography variant="subtitle1" fontWeight="600" sx={{ 
                    flexGrow: 1, 
                    fontSize: '0.875rem' 
                  }}>
                    {section.title}
                  </Typography>
                  <Chip
                    label={`${sectionCompletedItems}/${sectionItems.length}`}
                    color={sectionPercentage === 100 ? 'success' : 'default'}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem', mr: 1 }}
                  />
                </AccordionSummary>
                
                <AccordionDetails sx={{ pt: 1, pb: 2 }}>
                  <List sx={{ py: 0 }}>
                    {sectionItems
                      .sort((a: ChecklistItem, b: ChecklistItem) => a.order - b.order)
                      .map((item: ChecklistItem) => {
                        const itemKey = `${section.id}-${item.id}`;
                        const isChecked = guidelinesChecklist[itemKey] || false;
                        
                        return (
                          <ListItem key={item.id} sx={{ px: 0, py: 0.5 }}>
                            <Checkbox
                              checked={isChecked}
                              onChange={(e) => onGuidelineCheck(itemKey, e.target.checked)}
                              color="primary"
                              sx={{ mr: 1 }}
                            />
                            <ListItemText 
                              primary={
                                <Typography 
                                  variant="body2"
                                  sx={{
                                    fontSize: '0.875rem',
                                    textDecoration: isChecked ? 'line-through' : 'none',
                                    color: isChecked ? 'text.secondary' : 'text.primary',
                                    lineHeight: 1.5,
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
    </Box>
  );
};

export default ClientChecklistReviewCard;