// src/components/features/forms/ClientGuidelinesChecklist.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Chip,
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import { GuidelineSection, ChecklistItem } from '../../types/client';

interface ClientGuidelinesChecklistProps {
  guidelines: any;
  clientName: string;
  onChecklistUpdate?: (checklist: { [key: string]: boolean }) => void;
  initialChecklist?: { [key: string]: boolean };
}

const ClientGuidelinesChecklist: React.FC<ClientGuidelinesChecklistProps> = ({
  guidelines,
  clientName,
  onChecklistUpdate,
  initialChecklist = {},
}) => {
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>(initialChecklist);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  useEffect(() => {
    // Initialize expanded sections
    if (guidelines?.sections) {
      setExpandedSections(guidelines.sections.map((section: GuidelineSection) => section.id));
    }
  }, [guidelines]);

  const handleItemCheck = (itemKey: string, checked: boolean) => {
    const newChecklist = { ...checkedItems, [itemKey]: checked };
    setCheckedItems(newChecklist);
    onChecklistUpdate?.(newChecklist);
  };

  const toggleExpanded = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const renderSectionContent = (content: string) => {
    return (
      <Box 
        sx={{ 
          '& h1, & h2, & h3, & h4, & h5, & h6': { 
            fontWeight: 600,
            marginBottom: 1,
            marginTop: 2,
          },
          '& h1': { fontSize: '1.5rem' },
          '& h2': { fontSize: '1.25rem' },
          '& h3': { fontSize: '1.125rem' },
          '& p': { marginBottom: 1 },
          '& ul, & ol': { paddingLeft: 2, marginBottom: 1 },
          '& li': { marginBottom: 0.5 },
          '& strong': { fontWeight: 600 },
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };

  if (!guidelines) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            No guidelines available for {clientName}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const sections = guidelines.sections || [];
  const hasChecklistSections = sections.some((section: GuidelineSection) => 
    section.type === 'checklist' && section.checklistItems && section.checklistItems.length > 0
  );

  // Calculate completion stats
  const totalChecklistItems = sections.reduce((total: number, section: GuidelineSection) => {
    if (section.type === 'checklist' && section.checklistItems) {
      return total + section.checklistItems.length;
    }
    return total;
  }, 0);

  const completedItems = Object.values(checkedItems).filter(Boolean).length;
  const completionPercentage = totalChecklistItems > 0 ? (completedItems / totalChecklistItems) * 100 : 0;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="600">
            Client Guidelines Review
          </Typography>
          {hasChecklistSections && (
            <Chip
              label={`${completedItems}/${totalChecklistItems} checked`}
              color={completedItems === totalChecklistItems ? 'success' : 'primary'}
              size="small"
            />
          )}
        </Box>

        {hasChecklistSections && (
          <Box sx={{ mb: 2 }}>
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
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {completionPercentage.toFixed(0)}% guidelines reviewed
            </Typography>
          </Box>
        )}

        <Box>
          {sections
            .sort((a: GuidelineSection, b: GuidelineSection) => a.order - b.order)
            .map((section: GuidelineSection) => (
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
                  }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      alignItems: 'center',
                      gap: 1,
                    }
                  }}
                >
                  <Typography variant="subtitle1" fontWeight="600" sx={{ flexGrow: 1 }}>
                    {section.title}
                  </Typography>
                  {section.type === 'checklist' && (
                    <Typography variant="caption" color="primary" sx={{ 
                      bgcolor: 'primary.lighter', 
                      px: 1, 
                      py: 0.5, 
                      borderRadius: 1,
                      fontWeight: 600,
                      mr: 1
                    }}>
                      CHECKLIST
                    </Typography>
                  )}
                </AccordionSummary>
                
                <AccordionDetails sx={{ pt: 0 }}>
                  {section.type === 'checklist' && section.checklistItems ? (
                    <List sx={{ py: 0 }}>
                      {section.checklistItems
                        .sort((a, b) => a.order - b.order)
                        .map((item) => {
                          const itemKey = `${section.id}-${item.id}`;
                          const isChecked = checkedItems[itemKey] || false;
                          
                          return (
                            <ListItem key={item.id} sx={{ px: 0, py: 0.5 }}>
                              <Checkbox
                                checked={isChecked}
                                onChange={(e) => handleItemCheck(itemKey, e.target.checked)}
                                color="primary"
                                sx={{ mr: 1 }}
                              />
                              <ListItemText 
                                primary={
                                  <Typography 
                                    variant="body2"
                                    sx={{
                                      textDecoration: isChecked ? 'line-through' : 'none',
                                      color: isChecked ? 'text.secondary' : 'text.primary',
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
                  ) : (
                    renderSectionContent(section.content)
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
        </Box>

        {guidelines.updatedAt && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Last updated: {new Date(guidelines.updatedAt).toLocaleDateString()}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientGuidelinesChecklist;