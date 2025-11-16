// src/components/inbound/GeneratedPostCard.tsx

import React, {useState} from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import {JobResult} from '../../types/linkedInGeneration';

interface GeneratedPostCardProps {
  result: JobResult;
  aiTrendTitle: string;
  totalCost: number;
  createdAt: Date;
  onDelete?: () => void;
}

const GeneratedPostCard: React.FC<GeneratedPostCardProps> = ({
  result,
  aiTrendTitle,
  totalCost,
  createdAt,
  onDelete,
}) => {
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({open: false, message: '', severity: 'success'});

  const handleCopy = async () => {
    try {
      const textToCopy = `${result.post.content}\n\n${result.post.hashtags.join(' ')}`;
      await navigator.clipboard.writeText(textToCopy);
      setSnackbar({
        open: true,
        message: 'Post copied to clipboard!',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to copy to clipboard',
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  return (
    <>
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          mb: 3,
        }}
      >
        {/* Image */}
        {result.imageUrl && (
          <CardMedia
            component="img"
            height="300"
            image={result.imageUrl}
            alt="Generated meme"
            sx={{
              objectFit: 'cover',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
          />
        )}

        <CardContent sx={{p: 3}}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
              <Chip
                label={`Based on: ${aiTrendTitle}`}
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 600,
                }}
              />
              <Chip
                label={`${result.post.wordCount} words`}
                size="small"
                sx={{
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  fontWeight: 600,
                }}
              />
              <Chip
                label={`$${totalCost.toFixed(4)}`}
                size="small"
                sx={{
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  fontWeight: 600,
                }}
              />
            </Box>
            {onDelete && (
              <IconButton
                onClick={onDelete}
                size="small"
                sx={{
                  color: '#ef4444',
                  '&:hover': {
                    backgroundColor: '#fee2e2',
                  },
                }}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>

          {/* Post Content */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: '#f8fafc',
              mb: 2,
              whiteSpace: 'pre-wrap',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '15px',
              lineHeight: 1.6,
              color: '#1e293b',
            }}
          >
            {result.post.content}
          </Box>

          {/* Hashtags */}
          <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2}}>
            {result.post.hashtags.map((hashtag, index) => (
              <Chip
                key={index}
                label={hashtag.startsWith('#') ? hashtag : `#${hashtag}`}
                size="small"
                sx={{
                  backgroundColor: '#ede9fe',
                  color: '#6d28d9',
                  fontWeight: 600,
                }}
              />
            ))}
          </Box>

          {/* Actions */}
          <Box sx={{display: 'flex', gap: 2}}>
            <Button
              variant="contained"
              startIcon={<CopyIcon />}
              onClick={handleCopy}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontWeight: 600,
                textTransform: 'none',
                flex: 1,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                },
              }}
            >
              Copy Post
            </Button>
            {result.imageUrl && (
              <Button
                variant="outlined"
                startIcon={<ImageIcon />}
                onClick={() => window.open(result.imageUrl, '_blank')}
                sx={{
                  borderColor: '#667eea',
                  color: '#667eea',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#5568d3',
                    backgroundColor: '#ede9fe',
                  },
                }}
              >
                Open Image
              </Button>
            )}
          </Box>

          {/* Metadata */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 2,
              color: '#94a3b8',
              textAlign: 'right',
            }}
          >
            Generated {createdAt.toLocaleString()}
          </Typography>
        </CardContent>
      </Card>

      {/* Snackbar for copy feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{width: '100%'}}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default GeneratedPostCard;
