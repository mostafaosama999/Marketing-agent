// src/components/features/crm/LeadColumn.tsx
import React, { useState } from 'react';
import { Box, Typography, IconButton, TextField, Tooltip } from '@mui/material';
import { Edit as EditIcon, Check as CheckIcon, Close as CloseIcon, DragIndicator as DragIcon } from '@mui/icons-material';
import { Lead, LeadStatus } from '../../../types/lead';
import { LeadCard } from './LeadCard';

interface Column {
  id: string;
  title: string;
  icon: string;
  color: string;
  headerColor: string;
  count: number;
}

interface LeadColumnProps {
  column: Column;
  leads: Lead[];
  onDragOver: (e: any) => void;
  onDrop: (e: any, columnId: string) => void;
  onDragStart: (e: any, lead: Lead) => void;
  onLeadClick: (lead: Lead) => void;
  onAddLead: () => void;
  userProfile: any;
  onUpdateLabel?: (stageId: LeadStatus, newLabel: string) => Promise<void>;
  onColumnDragStart?: (e: any, columnId: string) => void;
  onColumnDragOver?: (e: any, columnId: string) => void;
  onColumnDragLeave?: () => void;
  onColumnDrop?: (e: any, columnId: string) => void;
  isDraggedOver?: boolean;
}

export const LeadColumn: React.FC<LeadColumnProps> = ({
  column,
  leads,
  onDragOver,
  onDrop,
  onDragStart,
  onLeadClick,
  onAddLead,
  userProfile,
  onUpdateLabel,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
  isDraggedOver,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLabel, setEditedLabel] = useState(column.title);
  const [isSaving, setIsSaving] = useState(false);
  const [showDragHandle, setShowDragHandle] = useState(false);

  const handleStartEdit = () => {
    setEditedLabel(column.title);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedLabel(column.title);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editedLabel.trim() || editedLabel === column.title || !onUpdateLabel) {
      handleCancelEdit();
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateLabel(column.id as LeadStatus, editedLabel.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating column label:', error);
      setEditedLabel(column.title); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };
  return (
    <Box
      sx={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        minWidth: 280,
        maxWidth: 280,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: isDraggedOver ? '3px solid #2196f3' : '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: isDraggedOver ? '0 12px 48px rgba(33, 150, 243, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s ease',
      }}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      {/* Column Header */}
      <Box
        draggable={onColumnDragStart && !isEditing}
        onDragStart={(e) => onColumnDragStart && onColumnDragStart(e, column.id)}
        onDragOver={(e) => {
          if (onColumnDragOver) {
            e.stopPropagation();
            onColumnDragOver(e, column.id);
          }
        }}
        onDragLeave={onColumnDragLeave}
        onDrop={(e) => {
          if (onColumnDrop) {
            e.stopPropagation();
            onColumnDrop(e, column.id);
          }
        }}
        onMouseEnter={() => setShowDragHandle(true)}
        onMouseLeave={() => setShowDragHandle(false)}
        sx={{
          background: column.headerColor,
          color: 'white',
          p: 3,
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          cursor: onColumnDragStart && !isEditing ? 'grab' : 'default',
          '&:active': {
            cursor: onColumnDragStart && !isEditing ? 'grabbing' : 'default',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, zIndex: 1, flex: 1 }}>
          {/* Drag Handle Indicator */}
          {onColumnDragStart && !isEditing && (
            <Box
              sx={{
                opacity: showDragHandle ? 1 : 0,
                transition: 'opacity 0.2s',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <DragIcon sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.8)' }} />
            </Box>
          )}

          <Typography sx={{ fontSize: '18px' }}>
            {column.icon}
          </Typography>

          {isEditing ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <TextField
                value={editedLabel}
                onChange={(e) => setEditedLabel(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                size="small"
                disabled={isSaving}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-root': {
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 600,
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                  },
                  '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white',
                  },
                }}
              />
              <IconButton
                size="small"
                onClick={handleSaveEdit}
                disabled={isSaving}
                sx={{
                  color: '#4caf50',
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': { bgcolor: 'white' },
                }}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleCancelEdit}
                disabled={isSaving}
                sx={{
                  color: '#f44336',
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': { bgcolor: 'white' },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{
                fontWeight: 600,
                color: 'white',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
              }}>
                {column.title}
              </Typography>
              {onUpdateLabel && (
                <Tooltip title="Edit column name">
                  <IconButton
                    size="small"
                    onClick={handleStartEdit}
                    sx={{
                      color: 'white',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '.MuiBox-root:hover &': {
                        opacity: 1,
                      },
                    }}
                  >
                    <EditIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          px: 1.5,
          py: 0.5,
          zIndex: 1,
          minWidth: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Typography sx={{
            fontWeight: 700,
            fontSize: '13px',
            color: 'white',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
          }}>
            {column.count}
          </Typography>
        </Box>
      </Box>

      {/* Column Content with Gradient Background */}
      <Box
        sx={{
          background: column.color,
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minHeight: 0,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(0, 0, 0, 0.3)',
            },
          },
        }}
      >
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onDragStart={onDragStart}
            onLeadClick={onLeadClick}
            userProfile={userProfile}
            columnId={column.id}
          />
        ))}
      </Box>
    </Box>
  );
};
