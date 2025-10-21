// src/pages/tasks/TaskReview.tsx - Final Version
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import ContentSubmissionModal from '../../components/forms/ContentSubmissionModal';
import TaskInfoSidebar from './TaskInfoSidebar';
import AIAnalysisDashboard from './AIAnalysisDashboard';
import GuidelinesManagerPanel from './GuidelinesManagerPanel';
import { GuidelineSection } from '../../types/client';
import { Ticket } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface ExtendedClientGuidelines {
  id: string;
  sections?: GuidelineSection[];
  brandVoice?: string;
  targetAudience?: string;
  contentStyle?: string;
  keyMessages?: string[];
  avoidTopics?: string[];
  seoKeywords?: string[];
  competitorAnalysis?: string;
  updatedAt?: string;
}

interface AIReview {
  overallScore: number;
  categories: { [key: string]: string };
  feedback: string;
  suggestions: string[];
}

const TaskReview: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const { userProfile } = useAuth();
  const [task, setTask] = useState<Ticket | null>(null);
  const [clientGuidelines, setClientGuidelines] = useState<ExtendedClientGuidelines | null>(null);
  const [guidelinesChecklist, setGuidelinesChecklist] = useState<{ [key: string]: boolean }>({});
  const [aiReview, setAiReview] = useState<AIReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingGuidelines, setLoadingGuidelines] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string>('');
  const [managerScore, setManagerScore] = useState<string>('');
  const [managerFeedback, setManagerFeedback] = useState<string>('');
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [reviewHistory, setReviewHistory] = useState<any[]>([]);

  const hasAIReview = () => aiReview !== null;
  const hasManagerReview = () => reviewHistory.length > 0 || managerScore !== '' || managerFeedback !== '';

  // Calculate checklist completion
  const getChecklistStats = () => {
    if (!clientGuidelines?.sections) return { completed: 0, total: 0, percentage: 0 };
    
    const checklistSections = clientGuidelines.sections.filter((section: GuidelineSection) => 
      section.type === 'checklist' && section.checklistItems && section.checklistItems.length > 0
    );
    
    const total = checklistSections.reduce((sum: number, section: GuidelineSection) => 
      sum + (section.checklistItems?.length || 0), 0
    );
    const completed = Object.values(guidelinesChecklist).filter(Boolean).length;
    const percentage = total > 0 ? (completed / total) * 100 : 100;
    
    return { completed, total, percentage };
  };

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) {
        setError('No task ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../services/firebase/firestore');

        const taskDoc = await getDoc(doc(db, 'tickets', taskId));

        if (taskDoc.exists()) {
          const taskData = { id: taskDoc.id, ...taskDoc.data() } as Ticket;

          // Fetch content subcollection data
          try {
            const contentDoc = await getDoc(doc(db, 'tickets', taskId, 'content', taskId));
            if (contentDoc.exists()) {
              const contentData = contentDoc.data();
              taskData.content = contentData.content;
              taskData.aiReview = contentData.aiReview;
              setReviewHistory(contentData.reviewHistory || []);
            }
          } catch (contentErr) {
            console.warn('Content subcollection not found for ticket:', taskId);
          }

          // Fetch financials subcollection for revenue data
          try {
            const financialsDoc = await getDoc(doc(db, 'tickets', taskId, 'financials', taskId));
            if (financialsDoc.exists()) {
              const financialsData = financialsDoc.data();
              taskData.estimatedRevenue = financialsData.estimatedRevenue;
            }
          } catch (financialsErr) {
            console.warn('Financials subcollection not found for ticket:', taskId);
          }

          setTask(taskData);
          setGuidelinesChecklist(taskData.guidelinesChecklist || {});

          if (taskData.aiReview) {
            setAiReview(taskData.aiReview);
          }

          if (taskData.clientName) {
            await fetchClientGuidelines(taskData.clientName);
          }
        } else {
          setError('Task not found');
        }
      } catch (err) {
        console.error('Error fetching task:', err);
        setError('Failed to load task');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  const fetchClientGuidelines = async (clientName: string) => {
    try {
      setLoadingGuidelines(true);
      
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../services/firebase/firestore');
      
      // First, find the client document
      const exactQuery = query(
        collection(db, 'clients'),
        where('name', '==', clientName)
      );
      let clientSnapshot = await getDocs(exactQuery);
      
      // If no exact match, try case-insensitive search
      if (clientSnapshot.empty) {
        const allClientsQuery = collection(db, 'clients');
        const allSnapshot = await getDocs(allClientsQuery);
        
        const matchingDocs = allSnapshot.docs.filter(doc => 
          doc.data().name?.toLowerCase() === clientName.toLowerCase()
        );
        
        if (matchingDocs.length > 0) {
          clientSnapshot = { docs: matchingDocs } as any;
        }
      }
      
      if (!clientSnapshot.empty) {
        const clientDoc = clientSnapshot.docs[0];
        const clientId = clientDoc.id;
        
        // Now fetch guidelines from the subcollection: clients/{clientId}/guidelines
        try {
          const guidelinesCollection = collection(db, 'clients', clientId, 'guidelines');
          const guidelinesSnapshot = await getDocs(guidelinesCollection);
          
          if (!guidelinesSnapshot.empty) {
            // Get the first (and likely only) guidelines document
            const guidelinesDoc = guidelinesSnapshot.docs[0];
            const guidelinesData = guidelinesDoc.data();
            
            // Transform the data to match our expected structure
            const transformedGuidelines: ExtendedClientGuidelines = {
              id: guidelinesDoc.id,
              sections: guidelinesData.sections || [],
              updatedAt: guidelinesData.updatedAt || guidelinesData.createdAt
            };
            
            setClientGuidelines(transformedGuidelines);
          } else {
            setClientGuidelines(null);
          }
        } catch (guidelinesErr) {
          console.error('Error fetching guidelines subcollection:', guidelinesErr);
          setClientGuidelines(null);
        }
      } else {
        setClientGuidelines(null);
      }
    } catch (err) {
      console.error('Error fetching client guidelines:', err);
      setError('Failed to load client guidelines');
    } finally {
      setLoadingGuidelines(false);
    }
  };

  const handleGuidelineCheck = async (guidelineKey: string, checked: boolean) => {
    const newChecklist = { ...guidelinesChecklist, [guidelineKey]: checked };
    setGuidelinesChecklist(newChecklist);

    if (task?.id) {
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../../services/firebase/firestore');

        await updateDoc(doc(db, 'tickets', task.id), {
          guidelinesChecklist: newChecklist,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error saving guidelines checklist:', err);
      }
    }
  };

  const handleContentSubmission = async (content: string) => {
    if (!task?.id) return;

    try {
      const { doc, updateDoc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../../services/firebase/firestore');

      // Update main ticket document status
      await updateDoc(doc(db, 'tickets', task.id), {
        status: 'internal_review',
        updatedAt: new Date().toISOString()
      });

      // Create/update content subcollection
      await setDoc(doc(db, 'tickets', task.id, 'content', task.id), {
        content: content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setTask(prev => prev ? { ...prev, content: content, status: 'internal_review' } : null);

      // Clear AI review when content is updated
      setAiReview(null);
    } catch (err) {
      console.error('Error updating task content:', err);
      setError('Failed to submit content');
    }
  };

  const handleAIReview = async () => {
    if (!task?.content || !task?.id) return;

    setReviewing(true);
    setError('');

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../services/firebase/firestore');
      
      const stripHtml = (html: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
      };
      
      const cleanText = stripHtml(task.content).trim();
      const cloudFunctionUrl = `https://analyzedocument-xrzj6m3rjq-uc.a.run.app`;
      
      const response = await fetch(cloudFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4-turbo', documentText: cleanText })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const aiReviewData = await response.json();
      
      // Enhanced transformation to handle ReviewMind-style data
      const transformedReview: AIReview = {
        overallScore: aiReviewData?.final_score || 85,
        categories: aiReviewData?.breakdown || {},
        feedback: aiReviewData?.comments?.[0]?.content || 'Analysis completed successfully.',
        suggestions: aiReviewData?.comments || []
      };

      setAiReview(transformedReview);

      // Update main ticket document
      await updateDoc(doc(db, 'tickets', task.id), {
        status: 'internal_review',
        aiReviewCompleted: true,
        updatedAt: new Date().toISOString()
      });

      // Update content subcollection with AI review
      await updateDoc(doc(db, 'tickets', task.id, 'content', task.id), {
        aiReview: transformedReview,
        rawAiResponse: aiReviewData,
        updatedAt: new Date().toISOString()
      });

      setTask(prev => prev ? { 
        ...prev, 
        aiReview: transformedReview, 
        status: 'internal_review', 
        aiReviewCompleted: true 
      } : null);

    } catch (err) {
      setError(`Failed to get AI review: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setReviewing(false);
    }
  };

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const handleSaveReview = async () => {
    if (!task?.id || !managerScore) {
      setError('Task ID or manager score is missing');
      return;
    }

    // Validate score
    const scoreValue = Number(managerScore);
    if (isNaN(scoreValue) || scoreValue < 1 || scoreValue > 10) {
      setError('Manager score must be a number between 1 and 10');
      return;
    }

    try {
      const { doc, setDoc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../../services/firebase/firestore');


      // Get current content to check existing reviewHistory
      const contentDoc = await getDoc(doc(db, 'tickets', task.id, 'content', task.id));
      const currentContent = contentDoc.exists() ? contentDoc.data() : {};
      const currentReviewHistory = currentContent.reviewHistory || [];


      // Get actual user from auth context
      const currentUser = userProfile?.displayName || userProfile?.email || 'Unknown User';

      // Create new review entry
      const newReview = {
        cycleNumber: currentReviewHistory.length + 1,
        managerScore: scoreValue,
        feedback: managerFeedback || '',
        reviewedAt: new Date().toISOString(),
        reviewedBy: currentUser
      };


      // Add to reviewHistory array
      const updatedReviewHistory = [...currentReviewHistory, newReview];

      // Use setDoc with merge to create document if it doesn't exist
      await setDoc(doc(db, 'tickets', task.id, 'content', task.id), {
        reviewHistory: updatedReviewHistory,
        updatedAt: new Date().toISOString(),
        // Ensure basic content document structure
        id: task.id,
        ticketId: task.id,
        createdAt: currentContent.createdAt || new Date().toISOString()
      }, { merge: true });


      // Update main ticket document with basic info
      await setDoc(doc(db, 'tickets', task.id), {
        guidelinesChecklist,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });


      // Update local state
      setTask(prev => prev ? {
        ...prev,
        guidelinesChecklist
      } : null);
      setReviewHistory(updatedReviewHistory);

      // Clear form
      setManagerScore('');
      setManagerFeedback('');

      showSuccessMessage('Manager review saved successfully!');
    } catch (err) {
      console.error('Error saving manager review:', err);
      setError(`Failed to save manager review: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!task) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">Task not found</Typography>
      </Box>
    );
  }

  const checklistStats = getChecklistStats();

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
      {/* Compact Header */}
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight="700" sx={{ fontSize: '1.5rem', mb: 0.5 }}>
          Content Review Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
          {task.title} • {task.clientName}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, maxWidth: 800, mx: 'auto' }}>
          {error}
        </Alert>
      )}

      {/* Main Dashboard Grid */}
      <Grid container spacing={2} sx={{ height: 'calc(100% - 80px)' }}>
        
        {/* Left Sidebar - Task Info & Quick Actions */}
        <Grid size={3}>
          <TaskInfoSidebar
            task={task}
            hasAIReview={hasAIReview()}
            hasManagerReview={hasManagerReview()}
            checklistStats={checklistStats}
            reviewing={reviewing}
            onOpenContentModal={() => setContentModalOpen(true)}
            onAIReview={handleAIReview}
          />
        </Grid>

        {/* Center - AI Analysis Dashboard */}
        <Grid size={6}>
          <AIAnalysisDashboard
            task={task}
            aiReview={aiReview}
            reviewing={reviewing}
            onAIReview={handleAIReview}
          />
        </Grid>

        {/* Right Panel - Guidelines & Manager Review */}
        <Grid size={3}>
          <GuidelinesManagerPanel
            task={task}
            clientGuidelines={clientGuidelines}
            loadingGuidelines={loadingGuidelines}
            guidelinesChecklist={guidelinesChecklist}
            managerScore={managerScore}
            managerFeedback={managerFeedback}
            hasManagerReview={hasManagerReview()}
            onGuidelineCheck={handleGuidelineCheck}
            onScoreChange={setManagerScore}
            onFeedbackChange={setManagerFeedback}
            onSaveReview={handleSaveReview}
          />
        </Grid>
      </Grid>

      {/* Success Notification */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={4000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Content Modal */}
      <ContentSubmissionModal
        open={contentModalOpen}
        onClose={() => setContentModalOpen(false)}
        onSubmit={handleContentSubmission}
        taskTitle={task.title}
        existingContent={task.content || ''}
      />
    </Box>
  );
};

export default TaskReview;