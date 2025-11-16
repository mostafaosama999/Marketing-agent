// src/components/inbound/PostIdeaCard.tsx

import React, {useState} from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import {PostIdea} from '../../types/postIdeas';

interface PostIdeaCardProps {
  idea: PostIdea;
  index: number;
  onSelect: (ideaId: string) => void;
  generating: boolean;
}

const PostIdeaCard: React.FC<PostIdeaCardProps> = ({
  idea,
  index,
  onSelect,
  generating,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getIdeaEmoji = (idx: number): string => {
    const emojis = ['🔥', '⚡', '💡', '🚀', '✨'];
    return emojis[idx % emojis.length];
  };

  const getStyleColor = (style: string): string => {
    const colors: Record<string, string> = {
      Listicle: '#3b82f6',
      'Contrarian Insight': '#ef4444',
      'Personal Story': '#8b5cf6',
      'Before/After': '#10b981',
      'Mini Case Study': '#f59e0b',
      Thread: '#06b6d4',
    };
    return colors[style] || '#667eea';
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        mb: 2,
        border: '2px solid transparent',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: '#667eea',
          boxShadow: '0 8px 30px rgba(102, 126, 234, 0.15)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{p: 3}}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{flex: 1}}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
              <Typography
                variant="h5"
                sx={{fontSize: '1.5rem', fontWeight: 700}}
              >
                {getIdeaEmoji(index)} IDEA {index + 1}
              </Typography>
              <Chip
                label={idea.postStyle}
                size="small"
                sx={{
                  backgroundColor: getStyleColor(idea.postStyle),
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            </Box>

            {/* Hook */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#1e293b',
                mb: 1,
                lineHeight: 1.4,
              }}
            >
              "{idea.hook}"
            </Typography>
          </Box>

          <IconButton
            onClick={() => setExpanded(!expanded)}
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
              color: '#667eea',
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        {/* Topic & Angle (Always visible) */}
        <Typography
          variant="body2"
          sx={{
            color: '#64748b',
            mb: 2,
            lineHeight: 1.6,
          }}
        >
          {idea.topicAndAngle}
        </Typography>

        {/* Quick Info Chips */}
        <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2}}>
          <Chip
            label={idea.estimatedWordCount}
            size="small"
            sx={{
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              fontWeight: 600,
            }}
          />
          <Chip
            label={idea.targetAudience}
            size="small"
            sx={{
              backgroundColor: '#ede9fe',
              color: '#6d28d9',
              fontWeight: 600,
            }}
          />
        </Box>

        {/* Expandable Details */}
        <Collapse in={expanded}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: '#f8fafc',
              mb: 2,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{fontWeight: 600, mb: 1, color: '#1e293b'}}
            >
              Why This Works For You:
            </Typography>
            <Typography
              variant="body2"
              sx={{color: '#64748b', mb: 2, lineHeight: 1.6}}
            >
              {idea.whyThisWorks}
            </Typography>

            <Typography
              variant="subtitle2"
              sx={{fontWeight: 600, mb: 1, color: '#1e293b'}}
            >
              Target Audience:
            </Typography>
            <Typography variant="body2" sx={{color: '#64748b', lineHeight: 1.6}}>
              {idea.targetAudience}
            </Typography>
          </Box>
        </Collapse>

        {/* Select Button */}
        <Button
          variant="contained"
          startIcon={<AutoAwesomeIcon />}
          onClick={() => onSelect(idea.id)}
          disabled={generating}
          fullWidth
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 600,
            textTransform: 'none',
            py: 1.5,
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
            },
            '&:disabled': {
              background: '#e2e8f0',
              color: '#94a3b8',
            },
          }}
        >
          {generating ? 'Generating...' : 'Select & Generate Post'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PostIdeaCard;
