// src/components/forms/ClientGuidelinesModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  ExpandMore,
  Add,
  Delete,
  DragIndicator,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import TiptapRichTextEditor from '../common/TiptapRichTextEditor';
import { GuidelineSection, ChecklistItem } from '../../types/client';

interface ClientGuidelinesModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (guidelines: any) => Promise<void>;
  guidelines?: any;
  clientName: string;
}

const ClientGuidelinesModal: React.FC<ClientGuidelinesModalProps> = ({
  open,
  onClose,
  onSubmit,
  guidelines,
  clientName,
}) => {
  const [sections, setSections] = useState<GuidelineSection[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSections([]);
      setExpandedSections([]);
      return;
    }

    if (guidelines?.sections && Array.isArray(guidelines.sections) && guidelines.sections.length > 0) {
      // Load existing sections and ensure they have the type field
      const sortedSections = [...guidelines.sections].sort((a, b) => a.order - b.order).map(section => {
        // Check if this section has the typical checklist content from your existing data
        const isExistingChecklistSection = section.title === 'Civo Alignment' && 
          section.content && 
          (section.content.includes('No links to competitors') || 
           section.content.includes('Links to Civo resources') ||
           section.content.includes('Civo-specific examples'));

        if (isExistingChecklistSection && !section.checklistItems) {
          // Convert the existing bullet points to checklist items
          return {
            ...section,
            type: 'checklist',
            checklistItems: [
              { id: 'check-1', text: 'No links to competitors were added', order: 0 },
              { id: 'check-2', text: 'Links to Civo resources were added', order: 1 },
              { id: 'check-3', text: 'Civo-specific examples were added', order: 2 }
            ],
            content: '' // Clear the old content since it's now checklist items
          };
        }

        return {
          ...section,
          type: section.type || 'freeform',
          checklistItems: section.checklistItems || []
        };
      });
      setSections(sortedSections);
      setExpandedSections(sortedSections.map((section: GuidelineSection) => section.id));
    } else if (guidelines?.content && !guidelines?.sections) {
      const legacySections: GuidelineSection[] = [
        {
          id: 'legacy-content',
          title: 'Content Guidelines',
          content: guidelines.content,
          order: 0,
          type: 'freeform',
        }
      ];
      setSections(legacySections);
      setExpandedSections(['legacy-content']);
    } else {
      const defaultSections: GuidelineSection[] = [
        {
          id: 'brand-voice',
          title: 'Brand Voice & Tone',
          content: '<p><strong>Tone:</strong> Friendly, educational, and non-technical</p>',
          order: 0,
          type: 'freeform',
        },
        {
          id: 'target-audience',
          title: 'Target Audience',
          content: '<p><strong>Primary Reader:</strong> Beginners, new to cloud computing and AI infrastructure</p>',
          order: 1,
          type: 'freeform',
        },
        {
          id: 'content-style',
          title: 'Content Style',
          content: `<h3><strong>1. ${clientName} First</strong></h3><ul><li>Always link to a <strong>${clientName} resource</strong> when referring to products, trends, or solutions</li><li>Avoid direct mentions or links to <strong>competitors</strong> (Amazon, Microsoft, Google, HashiCorp)</li><li>Use ${clientName}-specific examples wherever possible</li></ul><h3><strong>2. Beginner-Friendly Writing</strong></h3><ul><li>Explain technical terms simply — assume no prior expertise</li><li>Use analogies and real-world comparisons to make abstract ideas relatable</li></ul>`,
          order: 2,
          type: 'freeform',
        },
        {
          id: 'civo-alignment',
          title: 'Civo Alignment',
          content: '',
          order: 3,
          type: 'checklist',
          checklistItems: [
            { id: 'check-1', text: 'No links to competitors were added', order: 0 },
            { id: 'check-2', text: 'Links to Civo resources were added', order: 1 },
            { id: 'check-3', text: 'Civo-specific examples were added', order: 2 }
          ]
        },
      ];
      setSections(defaultSections);
      setExpandedSections(defaultSections.map(section => section.id));
    }
  }, [guidelines, clientName, open]);

  const addSection = () => {
    const newSection: GuidelineSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      content: '<p>Add your content here...</p>',
      order: sections.length,
      type: 'freeform',
      checklistItems: [],
    };
    setSections(prev => [...prev, newSection]);
    setExpandedSections(prev => [...prev, newSection.id]);
  };

  const updateSection = (id: string, updates: Partial<GuidelineSection>) => {
    setSections(prev => 
      prev.map(section => 
        section.id === id ? { ...section, ...updates } : section
      )
    );
  };

  const deleteSection = (id: string) => {
    setSections(prev => prev.filter(section => section.id !== id));
    setExpandedSections(prev => prev.filter(sectionId => sectionId !== id));
  };

  const toggleExpanded = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const addChecklistItem = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: 'New checklist item',
      order: (section.checklistItems || []).length,
    };

    updateSection(sectionId, {
      checklistItems: [...(section.checklistItems || []), newItem]
    });
  };

  const updateChecklistItem = (sectionId: string, itemId: string, updates: Partial<ChecklistItem>) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section || !section.checklistItems) return;

    const updatedItems = section.checklistItems.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );

    updateSection(sectionId, { checklistItems: updatedItems });
  };

  const deleteChecklistItem = (sectionId: string, itemId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section || !section.checklistItems) return;

    const updatedItems = section.checklistItems.filter(item => item.id !== itemId);
    updateSection(sectionId, { checklistItems: updatedItems });
  };

  const handleSectionTypeChange = (sectionId: string, newType: 'freeform' | 'checklist') => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    if (newType === 'checklist' && section.type === 'freeform') {
      // Convert freeform content to checklist items if possible
      const checklistItems: ChecklistItem[] = [
        {
          id: `item-${Date.now()}`,
          text: 'New checklist item',
          order: 0,
        }
      ];
      updateSection(sectionId, { 
        type: newType, 
        checklistItems,
        content: '' // Clear freeform content
      });
    } else if (newType === 'freeform' && section.type === 'checklist') {
      updateSection(sectionId, { 
        type: newType, 
        checklistItems: [],
        content: '<p>Add your content here...</p>'
      });
    } else {
      updateSection(sectionId, { type: newType });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);
    
    const guidelinesData = {
      sections: sortedSections,
      updatedAt: new Date().toISOString(),
      content: sortedSections.map(section => {
        if (section.type === 'checklist' && section.checklistItems) {
          const itemsList = section.checklistItems
            .sort((a, b) => a.order - b.order)
            .map(item => `<li>${item.text}</li>`)
            .join('');
          return `<h2><strong>${section.title}</strong></h2><ul>${itemsList}</ul>`;
        }
        return `<h2><strong>${section.title}</strong></h2>${section.content}`;
      }).join('\n\n'),
    };
    
    try {
      await onSubmit(guidelinesData);
      onClose();
    } catch (error) {
      console.error('Error submitting guidelines:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { 
          minHeight: '85vh',
          maxHeight: '95vh'
        }
      }}
    >
      <DialogTitle>
        <Typography variant="h5" fontWeight="bold">
          {guidelines ? 'Edit' : 'Add'} Content Guidelines for {clientName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          These guidelines help writers and reviewers maintain consistency across all content.
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="600">
              Guideline Sections
            </Typography>
            <Button
              startIcon={<Add />}
              onClick={addSection}
              variant="outlined"
              size="small"
            >
              Add Section
            </Button>
          </Box>

          {sections.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No sections yet. Click "Add Section" to create your first guideline section.
            </Alert>
          )}

          <Box sx={{ space: 1 }}>
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
                    <DragIndicator sx={{ color: 'text.disabled', cursor: 'grab' }} />
                    <Typography variant="subtitle1" fontWeight="600" sx={{ flexGrow: 1 }}>
                      {section.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                      {section.type === 'checklist' && (
                        <Typography variant="caption" color="primary" sx={{ 
                          bgcolor: 'primary.lighter', 
                          px: 1, 
                          py: 0.5, 
                          borderRadius: 1,
                          fontWeight: 600 
                        }}>
                          CHECKLIST
                        </Typography>
                      )}
                      <Tooltip title="Delete section">
                        <IconButton
                          component="div"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSection(section.id);
                          }}
                          sx={{ cursor: 'pointer' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </AccordionSummary>
                  
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Box sx={{ mb: 2 }}>
                      {/* Section Title */}
                      <TextField
                        label="Section Title"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        fullWidth
                        variant="outlined"
                        size="small"
                        sx={{ mb: 2 }}
                      />

                      {/* Content Type Selector */}
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Content Type</InputLabel>
                        <Select
                          value={section.type || 'freeform'}
                          label="Content Type"
                          onChange={(e) => handleSectionTypeChange(section.id, e.target.value as 'freeform' | 'checklist')}
                        >
                          <MenuItem value="freeform">Freeform Content</MenuItem>
                          <MenuItem value="checklist">Checklist Items</MenuItem>
                        </Select>
                      </FormControl>

                      {/* Freeform Content Editor */}
                      {section.type === 'freeform' && (
                        <>
                          <Typography variant="subtitle2" gutterBottom fontWeight="600">
                            Section Content
                          </Typography>
                          <TiptapRichTextEditor
                            value={section.content}
                            onChange={(newContent) => updateSection(section.id, { content: newContent })}
                            placeholder="Add guidelines for this section..."
                            height={300}
                          />
                        </>
                      )}

                      {/* Checklist Items */}
                      {section.type === 'checklist' && (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight="600">
                              Checklist Items
                            </Typography>
                            <Button
                              startIcon={<Add />}
                              onClick={() => addChecklistItem(section.id)}
                              variant="outlined"
                              size="small"
                            >
                              Add Item
                            </Button>
                          </Box>

                          {(!section.checklistItems || section.checklistItems.length === 0) && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                              No checklist items yet. Click "Add Item" to create requirements that reviewers can check off.
                            </Alert>
                          )}

                          <Box sx={{ space: 1 }}>
                            {(section.checklistItems || [])
                              .sort((a, b) => a.order - b.order)
                              .map((item, index) => (
                                <Box
                                  key={item.id}
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 2, 
                                    mb: 1,
                                    p: 2,
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 1,
                                    bgcolor: 'background.paper'
                                  }}
                                >
                                  <RadioButtonUnchecked sx={{ color: 'text.disabled' }} />
                                  <TextField
                                    value={item.text}
                                    onChange={(e) => updateChecklistItem(section.id, item.id, { text: e.target.value })}
                                    placeholder="Enter checklist requirement..."
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                  />
                                  <Tooltip title="Delete item">
                                    <IconButton
                                      size="small"
                                      onClick={() => deleteChecklistItem(section.id, item.id)}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              ))}
                          </Box>
                        </>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button 
          onClick={handleClose} 
          color="inherit" 
          size="large"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          size="large"
          disabled={sections.length === 0 || isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
        >
          {isSubmitting ? 'Saving...' : (guidelines ? 'Update Guidelines' : 'Save Guidelines')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientGuidelinesModal;