// src/components/features/companies/OfferIdeasGenerationUI.tsx
// UI for generating new AI-powered blog ideas

import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper } from '@mui/material';
import { AutoAwesome as GenerateIcon } from '@mui/icons-material';

interface OfferIdeasGenerationUIProps {
  companyName: string;
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
}

export const OfferIdeasGenerationUI: React.FC<OfferIdeasGenerationUIProps> = ({
  companyName,
  onGenerate,
  isGenerating,
}) => {
  const [prompt, setPrompt] = useState('');

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && prompt.trim()) {
      handleGenerate();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        padding: 4,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
          }}
        >
          Generate AI-Powered Blog Ideas
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: '#64748b',
            fontSize: '0.875rem',
          }}
        >
          Describe the type of blog topics that would resonate with {companyName}
        </Typography>
      </Box>

      {/* Prompt Input */}
      <TextField
        fullWidth
        multiline
        rows={6}
        placeholder={`Example prompts:
• "Generate technical blog ideas about AI/ML applications in fintech"
• "Suggest content ideas for developers working with cloud infrastructure"
• "Blog topics covering best practices for API security"

Be specific about the topics, technical depth, and target audience...`}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyPress}
        disabled={isGenerating}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#f8fafc',
            fontSize: '0.9rem',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
              borderWidth: 2,
            },
          },
        }}
      />

      {/* Character Counter */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography
          variant="caption"
          sx={{
            color: '#94a3b8',
            fontSize: '0.75rem',
          }}
        >
          {prompt.length} characters
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: '#94a3b8',
            fontSize: '0.75rem',
          }}
        >
          Ctrl + Enter to generate
        </Typography>
      </Box>

      {/* Generate Button */}
      <Button
        fullWidth
        variant="contained"
        size="large"
        startIcon={<GenerateIcon />}
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 600,
          textTransform: 'none',
          padding: '12px 24px',
          fontSize: '1rem',
          borderRadius: 2,
          '&:hover': {
            background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)',
          },
          '&:disabled': {
            background: '#e2e8f0',
            color: '#94a3b8',
          },
          transition: 'all 0.2s ease',
        }}
      >
        {isGenerating ? 'Generating Ideas...' : 'Generate Ideas'}
      </Button>

      {/* Tips */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          backgroundColor: '#f8fafc',
          borderRadius: 2,
          border: '1px solid #e2e8f0',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            fontWeight: 600,
            color: '#475569',
            mb: 0.5,
            fontSize: '0.75rem',
          }}
        >
          Tips for better results:
        </Typography>
        <Typography
          variant="caption"
          component="ul"
          sx={{
            color: '#64748b',
            fontSize: '0.75rem',
            pl: 2,
            m: 0,
            '& li': {
              mb: 0.5,
            },
          }}
        >
          <li>Be specific about technical topics and target audience</li>
          <li>Mention preferred content style (tutorial, case study, best practices)</li>
          <li>Include relevant technologies or frameworks if applicable</li>
          <li>The AI will generate 5-10 unique ideas based on your prompt</li>
        </Typography>
      </Box>
    </Paper>
  );
};
