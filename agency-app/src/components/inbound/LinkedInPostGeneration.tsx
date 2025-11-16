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
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import {LinkedInGenerationJob} from '../../types/linkedInGeneration';
import {PostIdeasSession} from '../../types/postIdeas';
import {
  subscribeToGenerationJob,
  subscribeToGenerationHistory,
  deleteGenerationJob,
  convertTimestampToDate,
} from '../../services/api/linkedInGenerationService';
import {
  generatePostIdeas,
  generatePostFromIdea,
  subscribeToLatestSession,
} from '../../services/api/postIdeasService';
import GeneratedPostCard from './GeneratedPostCard';
import PostIdeaCard from './PostIdeaCard';

interface LinkedInPostGenerationProps {
  userId?: string;
}

const LinkedInPostGeneration: React.FC<LinkedInPostGenerationProps> = ({
  userId,
}) => {
  // Step 1: Post Ideas Generation
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [currentSession, setCurrentSession] = useState<PostIdeasSession | null>(null);

  // Step 2: Full Post Generation
  const [generatingPost, setGeneratingPost] = useState(false);
  const [currentJob, setCurrentJob] = useState<LinkedInGenerationJob | null>(null);
  const [generatedPosts, setGeneratedPosts] = useState<LinkedInGenerationJob[]>([]);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({open: false, message: '', severity: 'info'});

  // Subscribe to latest post ideas session
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToLatestSession(userId, (session) => {
      setCurrentSession(session);
    });

    return () => unsubscribe();
  }, [userId]);

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
        setGeneratingPost(false);
        setSnackbar({
          open: true,
          message: 'LinkedIn post generated successfully!',
          severity: 'success',
        });
        // Reset current job after a delay
        setTimeout(() => setCurrentJob(null), 2000);
      } else if (job.status === 'failed') {
        setGeneratingPost(false);
        setSnackbar({
          open: true,
          message: `Generation failed: ${job.error || 'Unknown error'}`,
          severity: 'error',
        });
        setCurrentJob(null);
      }
    });

    return () => unsubscribe();
  }, [userId, currentJob]);

  // Handler: Generate 5 Post Ideas
  const handleGenerateIdeas = async () => {
    if (!userId) {
      setSnackbar({
        open: true,
        message: 'User not authenticated',
        severity: 'error',
      });
      return;
    }

    setGeneratingIdeas(true);

    try {
      const response = await generatePostIdeas();

      if (response.success) {
        setSnackbar({
          open: true,
          message: `Generated ${response.dataSourceCounts?.linkedInPosts} LinkedIn posts, ${response.dataSourceCounts?.newsletterEmails} newsletters, ${response.dataSourceCounts?.competitorPosts} competitor posts analyzed`,
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to generate post ideas',
          severity: 'error',
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    } finally {
      setGeneratingIdeas(false);
    }
  };

  // Handler: Select Idea and Generate Full Post
  const handleSelectIdea = async (ideaId: string) => {
    if (!userId || !currentSession) {
      setSnackbar({
        open: true,
        message: 'No session available',
        severity: 'error',
      });
      return;
    }

    setGeneratingPost(true);

    try {
      const response = await generatePostFromIdea(currentSession.id, ideaId);

      if (response.success) {
        // Set current job ID to start monitoring
        setCurrentJob({
          id: response.jobId,
          userId,
          status: 'pending',
          createdAt: {toDate: () => new Date()} as any,
          updatedAt: {toDate: () => new Date()} as any,
          aiTrendId: currentSession.id,
          aiTrendTitle: currentSession.ideas.find((i) => i.id === ideaId)?.hook || '',
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
          message: 'Generating full post with meme image...',
          severity: 'info',
        });
      } else {
        setGeneratingPost(false);
        setSnackbar({
          open: true,
          message: 'Failed to start post generation',
          severity: 'error',
        });
      }
    } catch (error) {
      setGeneratingPost(false);
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
      {/* Step 1: Generate Post Ideas */}
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
          <LightbulbIcon sx={{fontSize: 32, color: '#667eea'}} />
          <Box sx={{flex: 1}}>
            <Typography variant="h5" sx={{fontWeight: 700}}>
              Step 1: Generate 5 Strategic Post Ideas
            </Typography>
            <Typography variant="body2" sx={{color: '#64748b', mt: 0.5}}>
              Analyze your LinkedIn analytics, AI newsletters, and competitor posts to create
              personalized post suggestions
            </Typography>
          </Box>
        </Box>

        {/* Data Source Counts */}
        {currentSession && (
          <Box sx={{display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap'}}>
            <Chip
              label={`${currentSession.dataSourceCounts.linkedInPosts} LinkedIn Posts`}
              size="small"
              sx={{backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 600}}
            />
            <Chip
              label={`${currentSession.dataSourceCounts.newsletterEmails} Newsletters`}
              size="small"
              sx={{backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 600}}
            />
            <Chip
              label={`${currentSession.dataSourceCounts.competitorPosts} Competitor Posts`}
              size="small"
              sx={{backgroundColor: '#e0e7ff', color: '#3730a3', fontWeight: 600}}
            />
            <Chip
              label={`Cost: $${currentSession.totalCost.toFixed(4)}`}
              size="small"
              sx={{backgroundColor: '#f3e8ff', color: '#6b21a8', fontWeight: 600}}
            />
          </Box>
        )}

        {/* Generate Ideas Button */}
        <Button
          variant="contained"
          startIcon={
            generatingIdeas ? (
              <CircularProgress size={20} sx={{color: 'white'}} />
            ) : (
              <LightbulbIcon />
            )
          }
          onClick={handleGenerateIdeas}
          disabled={generatingIdeas}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 600,
            textTransform: 'none',
            px: 4,
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
          {generatingIdeas ? 'Analyzing Data Sources...' : 'Generate 5 Post Ideas'}
        </Button>
      </Card>

      {/* Step 2: Display Post Ideas */}
      {currentSession && currentSession.ideas && currentSession.ideas.length > 0 && (
        <Box sx={{mb: 4}}>
          <Typography
            variant="h6"
            sx={{
              mb: 3,
              fontWeight: 600,
              color: '#334155',
            }}
          >
            Select a Post Idea to Generate Full Post
          </Typography>

          <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
            {currentSession.ideas.map((idea, index) => (
              <PostIdeaCard
                key={idea.id}
                idea={idea}
                index={index}
                onSelect={handleSelectIdea}
                generating={generatingPost}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Progress Indicator for Full Post Generation */}
      {currentJob && currentJob.status !== 'completed' && (
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
          <Typography variant="h6" sx={{fontWeight: 600, mb: 2}}>
            Generating Full Post...
          </Typography>
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
        </Card>
      )}

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
