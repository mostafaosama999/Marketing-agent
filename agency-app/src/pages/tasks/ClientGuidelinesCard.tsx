// src/pages/tasks/ClientGuidelinesCard.tsx
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Chip,
  Alert,
  ListItemText,
  ListItem,
  List,
} from '@mui/material';
import {
  ExpandMore,
  Edit,
  CheckCircle,
} from '@mui/icons-material';
import { GuidelinesDocument } from '../../services/api/guidelines';
import { GuidelineSection } from '../../types/client';

interface ClientGuidelinesCardProps {
  guidelines?: GuidelinesDocument | null;
  clientName: string;
  onEdit?: () => void;
  showChecklistView?: boolean;
  // Legacy props for backward compatibility
  clientGuidelines?: any;
  loadingGuidelines?: boolean;
  guidelinesChecklist?: { [key: string]: boolean };
  onGuidelineCheck?: (guidelineKey: string, checked: boolean) => Promise<void>;
}

const ClientGuidelinesCard: React.FC<ClientGuidelinesCardProps> = ({
  guidelines,
  clientName,
  onEdit,
  showChecklistView = false,
  // Legacy props for backward compatibility
  clientGuidelines,
  loadingGuidelines = false,
  guidelinesChecklist = {},
  onGuidelineCheck,
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [checkedSections, setCheckedSections] = useState<string[]>([]);

  // Use guidelines prop if available, otherwise fall back to clientGuidelines
  const guidelinesData = guidelines || clientGuidelines;

  const toggleExpanded = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const toggleChecked = (sectionId: string) => {
    setCheckedSections(prev => 
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

  if (!guidelinesData) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            No guidelines set for {clientName}. Click "Edit Guidelines" to create them.
          </Alert>
        </CardContent>
        {onEdit && (
          <CardActions>
            <Button startIcon={<Edit />} onClick={onEdit} variant="outlined">
              Create Guidelines
            </Button>
          </CardActions>
        )}
      </Card>
    );
  }

  const sections = guidelinesData.sections || [];
  const hasLegacyContent = !guidelinesData.sections && guidelinesData.content;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="600">
            Client Guidelines
          </Typography>
          {showChecklistView && sections.length > 0 && (
            <Chip
              label={`${checkedSections.length}/${sections.length} completed`}
              color={checkedSections.length === sections.length ? 'success' : 'primary'}
              size="small"
            />
          )}
        </Box>

        {/* Legacy content display */}
        {hasLegacyContent && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Legacy guidelines format - consider updating to use sections
            </Typography>
            {renderSectionContent(guidelinesData.content!)}
          </Box>
        )}

        {/* Section-based display */}
        {sections.length > 0 && (
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
                    {showChecklistView && (
                      <Button
                        size="small"
                        startIcon={
                          checkedSections.includes(section.id) ? 
                            <CheckCircle color="success" /> : 
                            <CheckCircle color="disabled" />
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleChecked(section.id);
                        }}
                        sx={{ mr: 1, minWidth: 'auto' }}
                      />
                    )}
                    <Typography variant="subtitle1" fontWeight="600" sx={{ flexGrow: 1 }}>
                      {section.title}
                    </Typography>
                    {section.type === 'checklist' && (
                      <Chip 
                        label={`${(section.checklistItems || []).length} items`}
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                    )}
                  </AccordionSummary>
                  
                  <AccordionDetails sx={{ pt: 0 }}>
                    {section.type === 'checklist' && section.checklistItems ? (
                      <List sx={{ py: 0 }}>
                        {section.checklistItems
                          .sort((a, b) => a.order - b.order)
                          .map((item, index) => (
                            <ListItem key={item.id} sx={{ px: 0, py: 0.5 }}>
                              {showChecklistView ? (
                                <Button
                                  size="small"
                                  startIcon={<CheckCircle color="disabled" />}
                                  sx={{ mr: 1, minWidth: 'auto' }}
                                />
                              ) : (
                                <Box sx={{ 
                                  width: 6, 
                                  height: 6, 
                                  borderRadius: '50%', 
                                  bgcolor: 'primary.main',
                                  mr: 2,
                                  mt: 1
                                }} />
                              )}
                              <ListItemText 
                                primary={
                                  <Typography variant="body2">
                                    {item.text}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}
                      </List>
                    ) : (
                      renderSectionContent(section.content)
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
          </Box>
        )}

        {sections.length === 0 && !hasLegacyContent && (
          <Alert severity="warning">
            No guidelines available for {clientName}.
          </Alert>
        )}

        {guidelinesData.updatedAt && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Last updated: {new Date(guidelinesData.updatedAt).toLocaleDateString()}
          </Typography>
        )}
      </CardContent>
      
      <CardActions>
        {onEdit && (
          <Button startIcon={<Edit />} onClick={onEdit} variant="outlined">
            Edit Guidelines
          </Button>
        )}
        {showChecklistView && sections.length > 0 && checkedSections.length === sections.length && (
          <Chip
            label="All requirements reviewed"
            color="success"
            size="small"
            sx={{ ml: 'auto' }}
          />
        )}
      </CardActions>
    </Card>
  );
};

export default ClientGuidelinesCard;