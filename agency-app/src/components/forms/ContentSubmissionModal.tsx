// src/components/features/forms/ContentSubmissionModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import TiptapRichTextEditor from '../common/TiptapRichTextEditor';

interface ContentSubmissionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  taskTitle: string;
  existingContent?: string;
}

const ContentSubmissionModal: React.FC<ContentSubmissionModalProps> = ({
  open,
  onClose,
  onSubmit,
  taskTitle,
  existingContent = ''
}) => {
  const [content, setContent] = useState(existingContent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update content when existingContent changes
  useEffect(() => {
    setContent(existingContent);
  }, [existingContent]);

  const handleSubmit = async () => {
    if (content.trim()) {
      setIsSubmitting(true);
      try {
        await onSubmit(content);
        onClose();
      } catch (error) {
        console.error('Error submitting content:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Calculate word count from HTML content
  const getWordCount = (htmlContent: string): number => {
    // Strip HTML tags and count words
    const textContent = htmlContent.replace(/<[^>]*>/g, '').trim();
    return textContent.split(/\s+/).filter(word => word.length > 0).length;
  };

  const wordCount = getWordCount(content);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {existingContent ? 'Edit Content' : 'Submit Content'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Task: {taskTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Paste your article content below. This will be reviewed by AI and your manager.
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <TiptapRichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Paste your article content here..."
            height={400}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Word count: {wordCount}
          </Typography>
          {wordCount < 100 && wordCount > 0 && (
            <Alert severity="info" sx={{ py: 0 }}>
              Consider adding more content for a comprehensive review
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={!content.trim() || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : (existingContent ? 'Update Content' : 'Submit Content')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContentSubmissionModal;