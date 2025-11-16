// src/components/inbound/LinkedInPostGeneration.tsx

import React, {useState, useEffect} from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
  CircularProgress,
  LinearProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {AITrend} from '../../types/aiTrends';
import {LinkedInGenerationJob} from '../../types/linkedInGeneration';
import {
  generateLinkedInPost,
  subscribeToGenerationJob,
  subscribeToGenerationHistory,
  deleteGenerationJob,
  convertTimestampToDate,
  formatRelativeTime,
} from '../../services/api/linkedInGenerationService';
import GeneratedPostCard from './GeneratedPostCard';

interface LinkedInPostGenerationProps {
  aiTrends: AITrend[];
  userId?: string;
}

const LinkedInPostGeneration: React.FC<LinkedInPostGenerationProps> = ({
  aiTrends,
  userId,
}) => {
  // Removed selectedTrendId - will generate from all trends automatically
  const [generating, setGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<LinkedInGenerationJob | null>(null);
  const [generatedPosts, setGeneratedPosts] = useState<LinkedInGenerationJob[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({open: false, message: '', severity: 'info'});

  // Subscribe to generation history
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToGenerationHistory(
      userId,
      (jobs) => {
        // Filter only completed jobs with results
        const completedJobs = jobs.filter(
          (job) => job.status === 'completed' && job.result
        );
        setGeneratedPosts(completedJobs);
      },
      20 // Load last 20 generated posts
    );

    return () => unsubscribe();
  }, [userId]);

  // Subscribe to current job status
  useEffect(() => {
    if (!userId || !currentJob) return;

    const unsubscribe = subscribeToGenerationJob(userId, currentJob.id, (job) => {
      if (!job) {
        setCurrentJob(null);
        return;
      }

      setCurrentJob(job);

      // Check if job completed or failed
      if (job.status === 'completed') {
        setGenerating(false);
        setSnackbar({
          open: true,
          message: 'LinkedIn post generated successfully!',
          severity: 'success',
        });
        // Reset current job after a delay
        setTimeout(() => setCurrentJob(null), 2000);
      } else if (job.status === 'failed') {
        setGenerating(false);
        setSnackbar({
          open: true,
          message: `Generation failed: ${job.error || 'Unknown error'}`,
          severity: 'error',
        });
        setCurrentJob(null);
      }
    });

    return () => unsubscribe();
  }, [userId, currentJob?.id]);

  const handleGenerate = async () => {
    if (!userId || aiTrends.length === 0) {
      setSnackbar({
        open: true,
        message: 'No AI trends available to generate posts from',
        severity: 'error',
      });
      return;
    }

    setGenerating(true);

    try {
      // Pick the highest relevance trend automatically
      const topTrend = [...aiTrends].sort((a, b) => b.relevanceScore - a.relevanceScore)[0];

      if (!topTrend.id) {
        throw new Error('Selected trend has no ID');
      }

      const response = await generateLinkedInPost(topTrend.id);

      if (response.success) {
        // Set current job ID to start monitoring
        setCurrentJob({
          id: response.jobId,
          userId,
          status: 'pending',
          createdAt: {toDate: () => new Date()} as any,
          updatedAt: {toDate: () => new Date()} as any,
          aiTrendId: topTrend.id,
          aiTrendTitle: topTrend.title,
          progress: {
            stage: 'fetching_data',
            percentage: 0,
            message: 'Initializing...',
          },
          totalCost: 0,
          costs: {postGeneration: 0, imageGeneration: 0},
        });

        setSnackbar({
          open: true,
          message: `Generating post from: ${topTrend.title}`,
          severity: 'info',
        });
      } else {
        setGenerating(false);
        setSnackbar({
          open: true,
          message: 'Failed to start generation',
          severity: 'error',
        });
      }
    } catch (error) {
      setGenerating(false);
      setSnackbar({
        open: true,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!userId) return;

    try {
      await deleteGenerationJob(userId, jobId);
      setSnackbar({
        open: true,
        message: 'Post deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to delete post: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  const getStageIcon = () => {
    if (!currentJob) return null;

    if (currentJob.status === 'completed') {
      return <CheckCircleIcon sx={{color: '#10b981', fontSize: 24}} />;
    } else if (currentJob.status === 'failed') {
      return <ErrorIcon sx={{color: '#ef4444', fontSize: 24}} />;
    }
    return <CircularProgress size={24} sx={{color: '#667eea'}} />;
  };

  return (
    <Box>
      {/* Generation Controls */}
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          mb: 4,
          p: 3,
        }}
      >
        <Box sx={{display: 'flex', alignItems: 'center', gap: 2, mb: 3}}>
          <AutoAwesomeIcon sx={{fontSize: 32, color: '#667eea'}} />
          <Box>
            <Typography variant="h5" sx={{fontWeight: 700}}>
              Generate Final LinkedIn Posts
            </Typography>
            <Typography variant="body2" sx={{color: '#64748b', mt: 0.5}}>
              Combine AI trends with top competitor insights to create engaging posts with meme
              images
            </Typography>
          </Box>
        </Box>

        {/* Generate Button */}
        <Box sx={{display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between'}}>
          <Box>
            <Typography variant="body2" sx={{color: '#64748b', mb: 0.5}}>
              {aiTrends.length > 0
                ? `${aiTrends.length} AI trend${aiTrends.length > 1 ? 's' : ''} available • Will use top trending topic`
                : 'No AI trends available'}
            </Typography>
            {aiTrends.length > 0 && (
              <Typography variant="caption" sx={{color: '#94a3b8'}}>
                Combines top trends with competitor insights to create engaging posts
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            startIcon={
              generating ? (
                <CircularProgress size={20} sx={{color: 'white'}} />
              ) : (
                <AutoAwesomeIcon />
              )
            }
            onClick={handleGenerate}
            disabled={generating || aiTrends.length === 0}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 600,
              textTransform: 'none',
              px: 4,
              py: 1.5,
              whiteSpace: 'nowrap',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
              },
              '&:disabled': {
                background: '#e2e8f0',
                color: '#94a3b8',
              },
            }}
          >
            {generating ? 'Generating...' : 'Generate LinkedIn Post Suggestion'}
          </Button>
        </Box>

        {/* Progress Indicator */}
        {currentJob && currentJob.status !== 'completed' && (
          <Box sx={{mt: 3}}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 2, mb: 1}}>
              {getStageIcon()}
              <Typography variant="body2" sx={{color: '#64748b', flex: 1}}>
                {currentJob.progress.message}
              </Typography>
              <Typography variant="body2" sx={{color: '#667eea', fontWeight: 600}}>
                {currentJob.progress.percentage}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={currentJob.progress.percentage}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#e2e8f0',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        )}

        {/* No Trends Warning */}
        {aiTrends.length === 0 && (
          <Alert severity="info" sx={{mt: 2}}>
            No AI trends available. Please generate AI trends first using the "AI Trends Analysis"
            section above.
          </Alert>
        )}
      </Card>

      {/* Generated Posts List */}
      {generatedPosts.length > 0 && (
        <Box>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontWeight: 600,
              color: '#334155',
            }}
          >
            Generated Posts ({generatedPosts.length})
          </Typography>

          {generatedPosts.map((job) => (
            <GeneratedPostCard
              key={job.id}
              result={job.result!}
              aiTrendTitle={job.aiTrendTitle}
              totalCost={job.totalCost}
              createdAt={convertTimestampToDate(job.createdAt)}
              onDelete={() => handleDelete(job.id)}
            />
          ))}
        </Box>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{width: '100%'}}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LinkedInPostGeneration;
