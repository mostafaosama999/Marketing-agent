// src/pages/tasks/ClientGuidelinesReadingCard.tsx
import React, { useState } from 'react';
import {
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore,
  Rule as GuidelinesIcon,
  UnfoldMore,
  UnfoldLess,
} from '@mui/icons-material';
import { GuidelineSection } from '../../types/client';

interface ClientGuidelinesReadingCardProps {
  clientGuidelines: any;
  clientName: string;
  loadingGuidelines: boolean;
}

const ClientGuidelinesReadingCard: React.FC<ClientGuidelinesReadingCardProps> = ({
  clientGuidelines,
  clientName,
  loadingGuidelines,
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleExpanded = (sectionId: string) => {
    setExpandedSections(prev => {
      const newExpanded = prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];
      
      // Update allExpanded state based on current sections
      const readingSections = clientGuidelines?.sections?.filter((section: GuidelineSection) => 
        section.type === 'freeform' && section.content && section.content.trim()
      ) || [];
      setAllExpanded(readingSections.every((section: GuidelineSection) => newExpanded.includes(section.id)));
      
      return newExpanded;
    });
  };

  const toggleExpandAll = () => {
    const readingSections = clientGuidelines?.sections?.filter((section: GuidelineSection) => 
      section.type === 'freeform' && section.content && section.content.trim()
    ) || [];

    if (allExpanded) {
      setExpandedSections([]);
      setAllExpanded(false);
    } else {
      setExpandedSections(readingSections.map((section: GuidelineSection) => section.id));
      setAllExpanded(true);
    }
  };

  const renderSectionContent = (content: string) => {
    return (
      <Box 
        sx={{ 
          '& h1': {
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: 2,
            marginTop: 2,
            lineHeight: 1.3,
            color: 'text.primary',
          },
          '& h2': {
            fontSize: '1.125rem',
            fontWeight: 600,
            marginBottom: 1.5,
            marginTop: 2,
            lineHeight: 1.3,
            color: 'text.primary',
          },
          '& h3': {
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: 1,
            marginTop: 1.5,
            lineHeight: 1.3,
            color: 'text.primary',
          },
          '& h4': {
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: 0.5,
            marginTop: 1,
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
            marginTop: 0.5,
          },
          '& li': {
            fontSize: '0.875rem',
            marginBottom: 0.5,
            lineHeight: 1.5,
            color: 'text.primary',
          },
          '& blockquote': {
            borderLeft: '4px solid',
            borderLeftColor: 'primary.main',
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
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };

  if (loadingGuidelines) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1.125rem' }}>
          Content Guidelines
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            Loading guidelines...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!clientGuidelines) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1.125rem' }}>
          Content Guidelines
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            No guidelines available for {clientName}
          </Typography>
        </Alert>
      </Box>
    );
  }

  const sections = clientGuidelines.sections || [];
  const readingSections = sections.filter((section: GuidelineSection) => 
    section.type === 'freeform' && section.content && section.content.trim()
  );

  if (readingSections.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1.125rem' }}>
          Content Guidelines
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            No reading guidelines available for {clientName}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1.125rem' }}>
          Content Guidelines
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`${readingSections.length} sections`}
            color="primary"
            size="small"
            sx={{ fontSize: '0.75rem' }}
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

      <Box>
        {readingSections
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
                  bgcolor: 'grey.50',
                }}
              >
                <GuidelinesIcon sx={{ color: 'primary.main', mr: 1, fontSize: '1.125rem' }} />
                <Typography variant="subtitle1" fontWeight="600" sx={{ fontSize: '0.875rem' }}>
                  {section.title}
                </Typography>
              </AccordionSummary>
              
              <AccordionDetails sx={{ pt: 2, pb: 2 }}>
                {renderSectionContent(section.content)}
              </AccordionDetails>
            </Accordion>
          ))}
      </Box>

      {clientGuidelines.updatedAt && (
        <Typography variant="caption" color="text.secondary" sx={{ 
          display: 'block', 
          mt: 2, 
          fontSize: '0.75rem',
          textAlign: 'center'
        }}>
          Last updated: {new Date(clientGuidelines.updatedAt).toLocaleDateString()}
        </Typography>
      )}
    </Box>
  );
};

export default ClientGuidelinesReadingCard;