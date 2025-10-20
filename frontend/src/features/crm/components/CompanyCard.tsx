import React from 'react';
import { Card, CardContent, Typography, Box, IconButton, Chip } from '@mui/material';
import {
  Edit as EditIcon,
  Language as LanguageIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { Company } from '../../../app/types/crm';

interface CompanyCardProps {
  company: Company;
  onEdit: (company: Company) => void;
  onClick?: (company: Company) => void;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company, onEdit, onClick }) => {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking the edit button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (onClick) {
      onClick(company);
    }
  };

  return (
    <Card
      sx={{
        mb: 2,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          boxShadow: 3,
        },
      }}
      onClick={handleCardClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessIcon sx={{ fontSize: 18 }} />
              {company.name}
            </Typography>
            {company.totalApiCosts !== undefined && company.totalApiCosts > 0 && (
              <Chip
                label={`API: $${company.totalApiCosts < 0.01 ? company.totalApiCosts.toFixed(4) : company.totalApiCosts.toFixed(2)}`}
                size="small"
                color="info"
                sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(company);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Website */}
        {company.website && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <LanguageIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography
              variant="body2"
              color="text.secondary"
              component="a"
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              {company.website}
            </Typography>
          </Box>
        )}

        {/* Industry */}
        {company.industry && (
          <Box sx={{ mb: 1 }}>
            <Chip label={company.industry} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
          </Box>
        )}

        {/* Description */}
        {company.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {company.description.length > 100
              ? `${company.description.substring(0, 100)}...`
              : company.description}
          </Typography>
        )}

        {/* Status Indicators */}
        <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {company.blogQualified && (
            <Chip
              icon={<CheckCircleIcon />}
              label={company.blogQualificationData?.qualified ? 'Blog Qualified' : 'Not Qualified'}
              size="small"
              color={company.blogQualificationData?.qualified ? 'success' : 'default'}
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          )}
          {company.hasGeneratedIdeas && (
            <Chip
              icon={<CheckCircleIcon />}
              label="Has Ideas"
              size="small"
              color="secondary"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
