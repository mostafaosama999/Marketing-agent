// src/components/settings/PromptCard.tsx
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Collapse,
  Divider,
  Paper,
  TextField,
  Button,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Person as PersonIcon,
  LocalOffer as TagIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { PromptMetadata } from '../../data/prompts';
import TiptapRichTextEditor from '../common/TiptapRichTextEditor';
import { SafeHtmlRenderer } from '../../utils/htmlHelpers';

interface PromptCardProps {
  prompt: PromptMetadata;
  editable?: boolean;
  onSave?: (updatedPrompt: PromptMetadata) => void;
}

const categoryColors: Record<string, { bg: string; border: string; tag: string }> = {
  'LinkedIn Posts': {
    bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: '#667eea',
    tag: '#ddd6fe',
  },
  'Blog Analysis': {
    bg: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    border: '#3b82f6',
    tag: '#dbeafe',
  },
  'Writing Program Finder': {
    bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: '#10b981',
    tag: '#d1fae5',
  },
  'Writing Program Analyzer': {
    bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    border: '#f59e0b',
    tag: '#fef3c7',
  },
  'Idea Generation': {
    bg: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    border: '#ec4899',
    tag: '#fce7f3',
  },
  'Data Extraction': {
    bg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    border: '#8b5cf6',
    tag: '#ede9fe',
  },
};

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, editable = false, onSave }) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState<PromptMetadata>(prompt);
  const categoryStyle = categoryColors[prompt.category] || categoryColors['LinkedIn Posts'];

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setExpanded(true);
  };

  const handleSaveClick = () => {
    if (onSave) {
      onSave(editedPrompt);
    }
    setIsEditing(false);
  };

  const handleCancelClick = () => {
    setEditedPrompt(prompt); // Reset to original
    setIsEditing(false);
  };

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 2.5,
        border: `1px solid #e2e8f0`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
          borderColor: categoryStyle.border,
        },
      }}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: '18px',
                mb: 0.5,
                color: '#1e293b',
              }}
            >
              {prompt.name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5, lineHeight: 1.6 }}>
              {prompt.description}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            {editable && !isEditing && (
              <IconButton
                onClick={handleEditClick}
                sx={{
                  color: categoryStyle.border,
                  '&:hover': {
                    bgcolor: categoryStyle.tag,
                  },
                }}
                aria-label="edit prompt"
              >
                <EditIcon />
              </IconButton>
            )}
            <IconButton
              onClick={handleExpandClick}
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s',
              }}
              aria-expanded={expanded}
              aria-label="show more"
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Metadata Row */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
          {/* Version Badge */}
          <Chip
            label={`v${prompt.version}`}
            size="small"
            sx={{
              bgcolor: categoryStyle.tag,
              color: categoryStyle.border,
              fontWeight: 600,
              fontSize: '12px',
              height: 24,
            }}
          />

          {/* Author */}
          <Chip
            icon={<PersonIcon sx={{ fontSize: 14 }} />}
            label={prompt.author}
            size="small"
            variant="outlined"
            sx={{
              borderColor: '#cbd5e1',
              color: '#64748b',
              fontSize: '12px',
              height: 24,
            }}
          />

          {/* Category Tag */}
          <Chip
            label={prompt.category}
            size="small"
            sx={{
              background: categoryStyle.bg,
              color: 'white',
              fontWeight: 600,
              fontSize: '12px',
              height: 24,
            }}
          />
        </Box>

        {/* Tags Row */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {prompt.tags.map((tag) => (
            <Chip
              key={tag}
              icon={<TagIcon sx={{ fontSize: 12 }} />}
              label={tag}
              size="small"
              sx={{
                bgcolor: '#f1f5f9',
                color: '#475569',
                fontSize: '11px',
                height: 22,
                '& .MuiChip-icon': {
                  color: '#94a3b8',
                },
              }}
            />
          ))}
        </Box>

        {/* Expandable Section */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 2.5 }} />

          {/* Variables Section */}
          {prompt.variables && prompt.variables.length > 0 && (
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: '#475569',
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <CodeIcon sx={{ fontSize: 16 }} />
                Required Variables
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {prompt.variables.map((variable) => (
                  <Chip
                    key={variable}
                    label={`{{${variable}}}`}
                    size="small"
                    sx={{
                      bgcolor: 'white',
                      border: '1px solid #cbd5e1',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: categoryStyle.border,
                      fontWeight: 600,
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* System Prompt Section */}
          {(prompt.systemPrompt || isEditing) && (
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: '#475569',
                  mb: 1,
                }}
              >
                System Prompt {isEditing && <Chip label="Optional" size="small" sx={{ ml: 1, height: 18, fontSize: '10px' }} />}
              </Typography>
              {isEditing ? (
                <TiptapRichTextEditor
                  value={editedPrompt.systemPrompt || ''}
                  onChange={(value) => setEditedPrompt({ ...editedPrompt, systemPrompt: value })}
                  placeholder="Enter system prompt (optional)... You can format text with bold, italic, lists, etc."
                  height={250}
                />
              ) : (
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 1.5,
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  <SafeHtmlRenderer
                    html={prompt.systemPrompt || ''}
                    sx={{
                      fontSize: '13px',
                      color: '#334155',
                      lineHeight: 1.6,
                    }}
                  />
                </Paper>
              )}
            </Box>
          )}

          {/* User Prompt Section */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: '#475569',
                mb: 1,
              }}
            >
              Full Prompt
            </Typography>
            {isEditing ? (
              <TiptapRichTextEditor
                value={editedPrompt.userPrompt}
                onChange={(value) => setEditedPrompt({ ...editedPrompt, userPrompt: value })}
                placeholder="Enter user prompt template... You can format text with bold, italic, lists, etc."
                height={400}
              />
            ) : (
              <Paper
                sx={{
                  p: 2,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 1.5,
                  maxHeight: 300,
                  overflow: 'auto',
                }}
              >
                <SafeHtmlRenderer
                  html={prompt.userPrompt}
                  sx={{
                    fontSize: '13px',
                    color: '#334155',
                    lineHeight: 1.6,
                  }}
                />
              </Paper>
            )}
          </Box>

          {/* Output Schema Section */}
          {(editedPrompt.outputSchema || isEditing) && (
            <>
              <Divider sx={{ my: 3 }} />
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: '#475569',
                    mb: 1,
                  }}
                >
                  Output Structure (JSON Schema)
                </Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={12}
                    value={editedPrompt.outputSchema || ''}
                    onChange={(e) => setEditedPrompt({ ...editedPrompt, outputSchema: e.target.value })}
                    placeholder="Enter JSON output schema (optional)..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        bgcolor: '#f8fafc',
                        '&:hover fieldset': {
                          borderColor: categoryStyle.border,
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: categoryStyle.border,
                        },
                      },
                    }}
                  />
                ) : (
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 1.5,
                      maxHeight: 300,
                      overflow: 'auto',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        color: '#334155',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                      }}
                    >
                      {prompt.outputSchema}
                    </Typography>
                  </Paper>
                )}
              </Box>
            </>
          )}

          {/* Edit Actions */}
          {isEditing && (
            <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={handleCancelClick}
                startIcon={<CancelIcon />}
                sx={{
                  borderColor: '#cbd5e1',
                  color: '#64748b',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#94a3b8',
                    bgcolor: '#f8fafc',
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveClick}
                startIcon={<SaveIcon />}
                disabled={!editedPrompt.userPrompt.trim()}
                sx={{
                  background: categoryStyle.bg,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  '&:hover': {
                    opacity: 0.9,
                  },
                  '&:disabled': {
                    background: '#e2e8f0',
                    color: '#94a3b8',
                  },
                }}
              >
                Save Changes
              </Button>
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default PromptCard;
