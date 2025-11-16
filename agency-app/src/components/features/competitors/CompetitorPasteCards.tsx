import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
} from '@mui/material';
import {
  ContentPaste as PasteIcon,
  CloudUpload as ExtractIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { extractCompetitorPosts } from '../../../services/api/competitorPostsService';

interface PasteCardState {
  id: string;
  content: string;
  status: 'empty' | 'ready' | 'extracting' | 'success' | 'error';
  competitorName?: string;
  postsCount?: number;
  error?: string;
}

export default function CompetitorPasteCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<PasteCardState[]>([
    { id: '1', content: '', status: 'empty' },
    { id: '2', content: '', status: 'empty' },
    { id: '3', content: '', status: 'empty' },
  ]);

  const handlePaste = async (cardId: string) => {
    try {
      const text = await navigator.clipboard.readText();
      setCards(cards.map(card =>
        card.id === cardId
          ? { ...card, content: text, status: text.length > 100 ? 'ready' : 'empty', error: undefined }
          : card
      ));
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  const handleContentChange = (cardId: string, value: string) => {
    setCards(cards.map(card =>
      card.id === cardId
        ? { ...card, content: value, status: value.length > 100 ? 'ready' : 'empty', error: undefined }
        : card
    ));
  };

  const handleExtract = async (cardId: string) => {
    if (!user) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || card.content.length < 100) return;

    // Set extracting status
    setCards(cards.map(c =>
      c.id === cardId ? { ...c, status: 'extracting', error: undefined } : c
    ));

    try {
      const result = await extractCompetitorPosts(card.content, user.uid);

      // Update card with success
      setCards(cards.map(c =>
        c.id === cardId
          ? {
              ...c,
              status: 'success',
              competitorName: result.competitorName,
              postsCount: result.totalPosts,
              error: undefined,
            }
          : c
      ));
    } catch (error: any) {
      console.error('Extraction error:', error);
      setCards(cards.map(c =>
        c.id === cardId
          ? {
              ...c,
              status: 'error',
              error: error.message || 'Failed to extract posts',
            }
          : c
      ));
    }
  };

  const handleClear = (cardId: string) => {
    setCards(cards.map(card =>
      card.id === cardId
        ? { ...card, content: '', status: 'empty', competitorName: undefined, postsCount: undefined, error: undefined }
        : card
    ));
  };

  const handleRemoveCard = (cardId: string) => {
    if (cards.length > 1) {
      setCards(cards.filter(card => card.id !== cardId));
    }
  };

  const handleAddCard = () => {
    const newId = (Math.max(...cards.map(c => parseInt(c.id))) + 1).toString();
    setCards([...cards, { id: newId, content: '', status: 'empty' }]);
  };

  const getStatusColor = (status: PasteCardState['status']) => {
    switch (status) {
      case 'empty': return '#9e9e9e';
      case 'ready': return '#2196f3';
      case 'extracting': return '#ff9800';
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getStatusLabel = (card: PasteCardState) => {
    switch (card.status) {
      case 'empty': return 'Paste LinkedIn content';
      case 'ready': return 'Ready to extract';
      case 'extracting': return 'Extracting...';
      case 'success': return `${card.competitorName} - ${card.postsCount} posts`;
      case 'error': return 'Extraction failed';
      default: return '';
    }
  };

  return (
    <Box>
      {cards.map((card, index) => (
        <Card
          key={card.id}
          sx={{
            mb: 3,
            borderLeft: `4px solid ${getStatusColor(card.status)}`,
            position: 'relative',
          }}
        >
          <CardContent>
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6" fontWeight={600}>
                  Competitor #{index + 1}
                </Typography>
                <Chip
                  label={getStatusLabel(card)}
                  size="small"
                  sx={{
                    bgcolor: getStatusColor(card.status),
                    color: 'white',
                    fontWeight: 500,
                  }}
                />
              </Box>

              {cards.length > 1 && (
                <IconButton
                  size="small"
                  onClick={() => handleRemoveCard(card.id)}
                  disabled={card.status === 'extracting'}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* Success Message */}
            {card.status === 'success' && (
              <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Successfully extracted <strong>{card.postsCount}</strong> posts from{' '}
                  <strong>{card.competitorName}</strong>!
                </Typography>
              </Alert>
            )}

            {/* Error Message */}
            {card.status === 'error' && card.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {card.error}
              </Alert>
            )}

            {/* Instructions */}
            {card.status === 'empty' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>How to extract:</strong>
                </Typography>
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: '0.875rem' }}>
                  <li>Open a competitor's LinkedIn profile</li>
                  <li>Scroll through their posts</li>
                  <li>Select all (Cmd/Ctrl + A) and copy (Cmd/Ctrl + C)</li>
                  <li>Click "Paste from Clipboard" or paste manually below</li>
                  <li>Click "Extract Posts"</li>
                </ol>
              </Alert>
            )}

            {/* Paste Button */}
            <Box display="flex" gap={1} mb={2}>
              <Button
                variant="outlined"
                startIcon={<PasteIcon />}
                onClick={() => handlePaste(card.id)}
                disabled={card.status === 'extracting'}
                size="small"
              >
                Paste from Clipboard
              </Button>
            </Box>

            {/* Textarea */}
            <TextField
              fullWidth
              multiline
              rows={8}
              placeholder="Or paste LinkedIn profile feed content here..."
              value={card.content}
              onChange={(e) => handleContentChange(card.id, e.target.value)}
              disabled={card.status === 'extracting' || card.status === 'success'}
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                '& .MuiInputBase-root': {
                  bgcolor: card.status === 'success' ? '#f5f5f5' : 'white',
                },
              }}
            />

            {/* Character count */}
            {card.content && (
              <Typography variant="caption" color="textSecondary" mt={1} display="block">
                Characters: {card.content.length.toLocaleString()}
                {card.content.length < 100 && (
                  <Typography component="span" color="error" ml={1}>
                    (minimum 100 required)
                  </Typography>
                )}
              </Typography>
            )}

            {/* Action Buttons */}
            <Box display="flex" gap={1} mt={2}>
              <Button
                variant="contained"
                startIcon={card.status === 'extracting' ? <CircularProgress size={20} /> : <ExtractIcon />}
                onClick={() => handleExtract(card.id)}
                disabled={card.status !== 'ready'}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                }}
              >
                {card.status === 'extracting' ? 'Extracting...' : 'Extract Posts'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={() => handleClear(card.id)}
                disabled={card.status === 'extracting'}
              >
                Clear
              </Button>
            </Box>
          </CardContent>
        </Card>
      ))}

      {/* Add Card Button */}
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleAddCard}
        fullWidth
        sx={{
          borderStyle: 'dashed',
          borderWidth: 2,
          py: 2,
          '&:hover': {
            borderStyle: 'dashed',
            borderWidth: 2,
          },
        }}
      >
        Add Another Competitor Paste Box
      </Button>
    </Box>
  );
}
