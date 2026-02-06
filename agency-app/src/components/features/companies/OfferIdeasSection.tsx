// src/components/features/companies/OfferIdeasSection.tsx
// Main orchestrator component for AI-generated blog ideas workflow
// V1/V2/V3 run independently with per-version Firestore persistence

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Snackbar,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { AutoAwesome as AnalyzeIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { Company } from '../../../types/crm';
import {
  generateIdeasForCompany,
  saveApprovedIdeas,
  hasApprovedIdeas,
  getApprovedIdeas,
  GeneratedIdea,
} from '../../../services/api/companyIdeas';
import {
  analyzeCompanyWebsite,
  generateOfferIdeas,
  generateOfferIdeasV3,
  formatCost,
  BlogIdeaV2,
  BlogIdeaV3,
  IdeaValidationResult,
  CompanyProfileV2,
  ContentGap,
  MatchedConceptSimple,
  RawConceptSimple,
  // V2 staged functions for progressive UI
  v2Stage1Differentiators,
  v2Stage1_5ConceptMatching,
  v2Stage2ContentGaps,
  v2Stage3GenerateIdeas,
  v2Stage4ValidateIdeas,
} from '../../../services/firebase/cloudFunctions';
import { OfferIdeasReviewUI } from './OfferIdeasReviewUI';
import { ApprovedIdeasDisplay } from './ApprovedIdeasDisplay';
import { CompanyAnalysisResults } from './CompanyAnalysisResults';
import { BlogIdeasDisplay, BlogIdeasDisplayTriple, VersionStatus, V2StageResultsForDisplay } from './BlogIdeasDisplay';
import { doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase/firestore';

interface OfferIdeasSectionProps {
  company: Company;
  companyId: string;
}

type OverallState = 'empty' | 'analyzing' | 'running' | 'complete';

export const OfferIdeasSection: React.FC<OfferIdeasSectionProps> = ({
  company,
  companyId,
}) => {
  // Determine initial states from persisted data
  const hasApproved = hasApprovedIdeas(company);
  const hasAnalysis = !!company.offerAnalysis;
  const hasAnyIdeas = hasAnalysis && (
    ((company.offerAnalysis?.ideas?.length ?? 0) > 0) ||
    ((company.offerAnalysis?.v2?.ideas?.length ?? 0) > 0) ||
    ((company.offerAnalysis?.v3?.ideas?.length ?? 0) > 0)
  );

  const [overallState, setOverallState] = useState<OverallState>(
    hasAnyIdeas ? 'complete' : hasApproved ? 'complete' : 'empty'
  );

  // Per-version independent status
  const [v1Status, setV1Status] = useState<VersionStatus>(
    (company.offerAnalysis?.ideas?.length ?? 0) > 0 ? 'complete' : 'idle'
  );
  const [v2Status, setV2Status] = useState<VersionStatus>(
    (company.offerAnalysis?.v2?.ideas?.length ?? 0) > 0 ? 'complete' : 'idle'
  );
  const [v3Status, setV3Status] = useState<VersionStatus>(
    (company.offerAnalysis?.v3?.ideas?.length ?? 0) > 0 ? 'complete' : 'idle'
  );

  // Analysis result state (local mirror of Firestore data)
  const [analysisResult, setAnalysisResult] = useState<{
    companyAnalysis: any;
    ideas: any[];
    promptUsed: string;
    costInfo?: any;
    v2?: {
      ideas: BlogIdeaV2[];
      validationResults?: IdeaValidationResult[];
      companyProfile?: CompanyProfileV2;
      contentGaps?: ContentGap[];
      matchedConcepts?: MatchedConceptSimple[];
      costInfo?: any;
    };
    v3?: {
      ideas: BlogIdeaV3[];
      validationResults?: any[];
      matchedConcepts?: any[];
      trendConceptsUsed?: any[];
      debug?: any;
      costInfo?: any;
      generatedAt?: string;
      regenerationAttempts?: number;
      rejectedCount?: number;
    };
    dualVersionGeneration?: boolean;
    tripleVersionGeneration?: boolean;
  } | null>(company.offerAnalysis || null);

  // Chosen idea state
  const [chosenIdea, setChosenIdea] = useState<string | null>(
    (company.customFields?.['chosen_idea'] as string) || null
  );
  const [chosenIdeaVersion, setChosenIdeaVersion] = useState<'v1' | 'v2' | 'v3' | null>(
    (company.customFields?.['chosen_idea_version'] as 'v1' | 'v2' | 'v3') || null
  );

  const [isV3DebugOpen, setIsV3DebugOpen] = useState(false);

  // V2 stage progress for progressive display
  const [v2StageResults, setV2StageResults] = useState<V2StageResultsForDisplay>(
    { currentStage: 'idle' }
  );

  // Legacy idea generation state
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [generationPrompt, setGenerationPrompt] = useState<string>('');
  const [generalFeedback, setGeneralFeedback] = useState<string>('');
  const [costInfo, setCostInfo] = useState<any>(null);

  // Track if pipelines are currently running (to prevent onSnapshot from overwriting)
  const isRunningRef = useRef(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  // Load existing approved ideas if they exist
  useEffect(() => {
    if (company.offerIdeas?.ideas && company.offerIdeas.ideas.length > 0) {
      setIdeas(company.offerIdeas.ideas);
      setGeneralFeedback(company.offerIdeas.generalFeedback || '');
      setGenerationPrompt(company.offerIdeas.generationPrompt || '');
      setSessionId(company.offerIdeas.sessionId || '');
    }
  }, [company]);

  // Subscribe to real-time updates for offerAnalysis
  useEffect(() => {
    const companyRef = doc(db, 'entities', companyId);

    const unsubscribe = onSnapshot(companyRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const offerAnalysis = data?.offerAnalysis;

        // Always sync chosen idea
        const chosenIdeaValue = data?.customFields?.['chosen_idea'];
        const chosenIdeaVersionValue = data?.customFields?.['chosen_idea_version'] as 'v1' | 'v2' | 'v3' | undefined;
        setChosenIdea(chosenIdeaValue || null);
        setChosenIdeaVersion(chosenIdeaVersionValue || null);

        // Only update from Firestore when we're NOT actively running pipelines
        // (prevents onSnapshot from overwriting in-progress local state)
        if (!isRunningRef.current && offerAnalysis) {
          // Update per-version statuses from persisted data
          if (offerAnalysis.ideas?.length > 0) {
            setV1Status('complete');
          }
          if (offerAnalysis.v2?.ideas?.length > 0) {
            setV2Status('complete');
          }
          if (offerAnalysis.v3?.ideas?.length > 0) {
            setV3Status('complete');
          }

          // Update local analysis result
          setAnalysisResult({
            companyAnalysis: offerAnalysis.companyAnalysis,
            ideas: offerAnalysis.ideas || [],
            promptUsed: offerAnalysis.promptUsed || '',
            costInfo: offerAnalysis.costInfo,
            v2: offerAnalysis.v2 ? {
              ideas: offerAnalysis.v2.ideas || [],
              validationResults: offerAnalysis.v2.validationResults,
              companyProfile: offerAnalysis.v2.companyProfile,
              contentGaps: offerAnalysis.v2.contentGaps,
              matchedConcepts: offerAnalysis.v2.matchedConcepts,
              costInfo: offerAnalysis.v2.costInfo,
            } : undefined,
            v3: offerAnalysis.v3 ? {
              ideas: offerAnalysis.v3.ideas || [],
              validationResults: offerAnalysis.v3.validationResults,
              matchedConcepts: offerAnalysis.v3.matchedConcepts,
              trendConceptsUsed: offerAnalysis.v3.trendConceptsUsed,
              debug: offerAnalysis.v3.debug,
              costInfo: offerAnalysis.v3.costInfo,
              generatedAt: offerAnalysis.v3.generatedAt,
              regenerationAttempts: offerAnalysis.v3.regenerationAttempts,
              rejectedCount: offerAnalysis.v3.rejectedCount,
            } : undefined,
            dualVersionGeneration: offerAnalysis.dualVersionGeneration,
            tripleVersionGeneration: offerAnalysis.tripleVersionGeneration,
          });

          // Set overall state
          const anyIdeas = offerAnalysis.ideas?.length > 0 ||
            offerAnalysis.v2?.ideas?.length > 0 ||
            offerAnalysis.v3?.ideas?.length > 0;
          if (anyIdeas) {
            setOverallState('complete');
          }
        }
      }
    });

    return () => unsubscribe();
  }, [companyId]);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // ========================================
  // Independent pipeline runners
  // ========================================

  const runV1Pipeline = async (
    stage1CompanyAnalysis: any,
    websiteUrl: string,
    blogContent: string | undefined,
  ) => {
    setV1Status('generating');
    try {
      const v1Result = await generateOfferIdeas(
        companyId,
        company.name,
        websiteUrl,
        stage1CompanyAnalysis,
        blogContent
      );

      // Update local state
      setAnalysisResult(prev => ({
        ...prev!,
        ideas: v1Result.ideas,
        promptUsed: v1Result.promptUsed,
        dualVersionGeneration: true,
      }));

      // Save V1 results to Firestore immediately
      const companyRef = doc(db, 'entities', companyId);
      await updateDoc(companyRef, {
        'offerAnalysis.ideas': v1Result.ideas,
        'offerAnalysis.promptUsed': v1Result.promptUsed,
        'offerAnalysis.dualVersionGeneration': true,
        'offerAnalysis.costInfo.stage2CostV1': v1Result.costInfo.totalCost,
        updatedAt: serverTimestamp(),
      });

      setV1Status('complete');
      showSnackbar(`V1: ${v1Result.ideas.length} ideas ready`, 'success');
    } catch (err: any) {
      console.error('V1 pipeline failed:', err);
      setV1Status('error');
      showSnackbar(`V1 failed: ${err.message}`, 'error');
    }
  };

  const runV2Pipeline = async (
    stage1CompanyAnalysis: any,
    websiteUrl: string,
    apolloData: any,
    blogAnalysisData: any,
  ) => {
    setV2Status('generating');
    setV2StageResults({ currentStage: 'stage1' });

    try {
      // V2 Stage 1: Differentiators
      const v2Stage1Result = await v2Stage1Differentiators(
        companyId,
        company.name,
        websiteUrl,
        apolloData,
        blogAnalysisData,
        stage1CompanyAnalysis.companyType
      );
      const v2Profile = v2Stage1Result.profile;
      let v2TotalCost = v2Stage1Result.costInfo.totalCost;

      setV2StageResults(prev => ({ ...prev, profile: v2Profile, currentStage: 'stage1_5' }));

      // V2 Stage 1.5 + Stage 2 in parallel
      const [v2Stage1_5Result, v2Stage2Result] = await Promise.all([
        v2Stage1_5ConceptMatching(companyId, v2Profile).catch(err => {
          console.warn('Stage 1.5 failed (AI concepts optional):', err);
          return {
            matchedConcepts: [] as MatchedConceptSimple[],
            allConcepts: [] as RawConceptSimple[],
            conceptsEvaluated: 0,
            stage0Cost: 0,
            stage1_5Cost: 0,
            cached: false,
            stale: undefined as boolean | undefined,
            ageHours: undefined as number | undefined,
          };
        }),
        v2Stage2ContentGaps(companyId, v2Profile, company.blogAnalysis?.contentSummary),
      ]);

      const v2MatchedConcepts = v2Stage1_5Result.matchedConcepts;
      const v2AllConcepts = v2Stage1_5Result.allConcepts || [];
      v2TotalCost += (v2Stage1_5Result.stage0Cost || 0) + (v2Stage1_5Result.stage1_5Cost || 0);
      const v2Gaps = v2Stage2Result.gaps;
      v2TotalCost += v2Stage2Result.costInfo.totalCost;

      setV2StageResults(prev => ({
        ...prev,
        matchedConcepts: v2MatchedConcepts,
        allConcepts: v2AllConcepts,
        conceptsEvaluated: v2Stage1_5Result.conceptsEvaluated || 0,
        conceptsCached: v2Stage1_5Result.cached,
        conceptsStale: v2Stage1_5Result.stale,
        conceptsAgeHours: v2Stage1_5Result.ageHours,
        contentGaps: v2Gaps,
        currentStage: 'stage3',
      }));

      // V2 Stage 3: Generate ideas
      const v2Stage3Result = await v2Stage3GenerateIdeas(
        companyId,
        v2Profile,
        v2Gaps,
        v2MatchedConcepts.length > 0 ? v2MatchedConcepts : undefined,
        v2AllConcepts.length > 0 ? v2AllConcepts : undefined
      );
      const v2RawIdeas = v2Stage3Result.ideas;
      v2TotalCost += v2Stage3Result.costInfo.totalCost;

      setV2StageResults(prev => ({ ...prev, rawIdeas: v2RawIdeas, currentStage: 'stage4' }));

      // V2 Stage 4: Validate ideas
      const v2Stage4Result = await v2Stage4ValidateIdeas(companyId, v2RawIdeas, v2Profile);
      const v2ValidationResults = v2Stage4Result.validIdeas;
      v2TotalCost += v2Stage4Result.costInfo.totalCost;

      setV2StageResults(prev => ({ ...prev, validatedIdeas: v2ValidationResults, currentStage: 'complete' }));

      const finalV2Ideas = v2ValidationResults.length > 0
        ? v2ValidationResults.map(r => r.idea)
        : v2RawIdeas;

      // Update local state
      const v2Data = {
        ideas: finalV2Ideas,
        validationResults: v2ValidationResults,
        companyProfile: v2Profile,
        contentGaps: v2Gaps,
        matchedConcepts: v2MatchedConcepts,
        costInfo: {
          stage1Cost: v2Stage1Result.costInfo.totalCost,
          stage1_5Cost: (v2Stage1_5Result.stage0Cost || 0) + (v2Stage1_5Result.stage1_5Cost || 0),
          stage2Cost: v2Stage2Result.costInfo.totalCost,
          stage3Cost: v2Stage3Result.costInfo.totalCost,
          stage4Cost: v2Stage4Result.costInfo.totalCost,
          totalCost: v2TotalCost,
        },
      };
      setAnalysisResult(prev => ({ ...prev!, v2: v2Data }));

      // Save V2 results to Firestore immediately
      const companyRef = doc(db, 'entities', companyId);
      await updateDoc(companyRef, {
        'offerAnalysis.v2': v2Data,
        'offerAnalysis.dualVersionGeneration': true,
        'offerAnalysis.costInfo.stage2CostV2': v2TotalCost,
        updatedAt: serverTimestamp(),
      });

      setV2Status('complete');
      const conceptMsg = v2MatchedConcepts.length > 0 ? ` + ${v2MatchedConcepts.length} AI concepts` : '';
      showSnackbar(`V2: ${finalV2Ideas.length} ideas ready${conceptMsg}`, 'success');
    } catch (err: any) {
      console.error('V2 pipeline failed:', err);
      setV2Status('error');
      showSnackbar(`V2 failed: ${err.message}`, 'error');
    }
  };

  const runV3Pipeline = async (
    stage1CompanyAnalysis: any,
    websiteUrl: string,
    apolloData: any,
    blogAnalysisData: any,
    specificRequirements: string | undefined,
  ) => {
    setV3Status('generating');
    try {
      const v3Result = await generateOfferIdeasV3(
        companyId,
        company.name,
        websiteUrl,
        apolloData,
        blogAnalysisData,
        stage1CompanyAnalysis.companyType,
        specificRequirements
      );

      if (!v3Result) {
        setV3Status('error');
        showSnackbar('V3 returned no results', 'error');
        return;
      }

      // Update local state
      const v3Data = {
        ideas: v3Result.ideas,
        validationResults: v3Result.validationResults,
        matchedConcepts: v3Result.matchedConcepts,
        trendConceptsUsed: v3Result.trendConceptsUsed,
        debug: v3Result.debug,
        costInfo: v3Result.costInfo,
        generatedAt: v3Result.generatedAt,
        regenerationAttempts: v3Result.regenerationAttempts,
        rejectedCount: v3Result.rejectedCount,
      };
      setAnalysisResult(prev => ({ ...prev!, v3: v3Data, tripleVersionGeneration: true }));

      // Save V3 results to Firestore immediately
      const companyRef = doc(db, 'entities', companyId);
      await updateDoc(companyRef, {
        'offerAnalysis.v3': v3Data,
        'offerAnalysis.tripleVersionGeneration': true,
        'offerAnalysis.costInfo.stage2CostV3': v3Result.costInfo?.totalCost || 0,
        updatedAt: serverTimestamp(),
      });

      setV3Status('complete');
      showSnackbar(`V3: ${v3Result.ideas.length} ideas ready`, 'success');
    } catch (err: any) {
      console.error('V3 pipeline failed:', err);
      setV3Status('error');
      showSnackbar(`V3 failed: ${err.message}`, 'error');
    }
  };

  // ========================================
  // Main analysis handler
  // ========================================

  const handleStartAnalysis = async () => {
    const websiteBlogLink = company.customFields?.website_blog_link as string | undefined;
    const websiteUrl = company.website || websiteBlogLink || company.blogAnalysis?.blogUrl;

    if (!websiteUrl) {
      showSnackbar('Company website or blog URL is required for analysis', 'error');
      return;
    }

    setOverallState('analyzing');
    isRunningRef.current = true;

    try {
      const blogContent = company.blogAnalysis?.blogUrl || undefined;

      // STEP 1: Analyze company website (shared prerequisite)
      const stage1Result = await analyzeCompanyWebsite(
        companyId,
        company.name,
        websiteUrl,
        blogContent
      );

      // Save company analysis immediately
      const companyRef = doc(db, 'entities', companyId);
      await updateDoc(companyRef, {
        'offerAnalysis.companyAnalysis': stage1Result.companyAnalysis,
        'offerAnalysis.costInfo': { stage1Cost: stage1Result.costInfo.totalCost, totalCost: stage1Result.costInfo.totalCost },
        updatedAt: serverTimestamp(),
      });

      // Show company analysis results
      setAnalysisResult({
        companyAnalysis: stage1Result.companyAnalysis,
        ideas: [],
        promptUsed: '',
        costInfo: { stage1Cost: stage1Result.costInfo.totalCost, totalCost: stage1Result.costInfo.totalCost },
      });

      showSnackbar(
        `Company type: ${stage1Result.companyAnalysis.companyType}. Starting V1, V2, V3...`,
        'info'
      );

      // Switch to running state — tabs will now be visible
      setOverallState('running');

      // Prepare shared data
      const apolloData = company.apolloEnrichment ? {
        industry: company.apolloEnrichment.industry,
        industries: company.apolloEnrichment.industries,
        employeeCount: company.apolloEnrichment.employeeCount,
        employeeRange: company.apolloEnrichment.employeeRange,
        foundedYear: company.apolloEnrichment.foundedYear,
        totalFunding: company.apolloEnrichment.totalFunding,
        totalFundingFormatted: company.apolloEnrichment.totalFundingFormatted,
        latestFundingStage: company.apolloEnrichment.latestFundingStage,
        technologies: company.apolloEnrichment.technologies,
        keywords: company.apolloEnrichment.keywords,
        description: company.apolloEnrichment.description,
      } : undefined;

      const blogAnalysisData = company.blogAnalysis ? {
        isTechnical: company.blogAnalysis.blogNature?.isTechnical,
        hasCodeExamples: company.blogAnalysis.blogNature?.hasCodeExamples,
        hasDiagrams: company.blogAnalysis.blogNature?.hasDiagrams,
        isDeveloperB2BSaas: company.blogAnalysis.isDeveloperB2BSaas,
        monthlyFrequency: company.blogAnalysis.monthlyFrequency,
        contentSummary: company.blogAnalysis.contentSummary,
        rating: company.blogAnalysis.blogNature?.rating,
      } : undefined;

      const specificRequirements =
        (company.customFields?.offer_idea_requirements as string | undefined) ||
        (company.customFields?.specific_requirements as string | undefined) ||
        undefined;

      // Fire all 3 pipelines independently (not awaited together)
      const v1Done = runV1Pipeline(stage1Result.companyAnalysis, websiteUrl, blogContent);
      const v2Done = runV2Pipeline(stage1Result.companyAnalysis, websiteUrl, apolloData, blogAnalysisData);
      const v3Done = runV3Pipeline(stage1Result.companyAnalysis, websiteUrl, apolloData, blogAnalysisData, specificRequirements);

      // Wait for all to settle (success or error)
      await Promise.allSettled([v1Done, v2Done, v3Done]);

      // All pipelines done
      isRunningRef.current = false;
      setOverallState('complete');

    } catch (error: any) {
      console.error('Error in company analysis (Step 1):', error);
      showSnackbar(error.message || 'Failed to analyze company', 'error');
      isRunningRef.current = false;
      setOverallState('empty');
    }
  };

  // Handle regenerate analysis
  const handleRegenerateAnalysis = async () => {
    try {
      const companyRef = doc(db, 'entities', companyId);
      await updateDoc(companyRef, {
        offerAnalysis: null,
        pendingOfferApproval: false,
        pendingOfferApprovalAt: null,
        updatedAt: serverTimestamp(),
      });

      setAnalysisResult(null);
      setChosenIdea(null);
      setV1Status('idle');
      setV2Status('idle');
      setV3Status('idle');
      setV2StageResults({ currentStage: 'idle' });
      setOverallState('empty');
      showSnackbar('Ready to run new analysis', 'info');
    } catch (error: any) {
      console.error('Error clearing analysis:', error);
      showSnackbar('Failed to clear analysis', 'error');
    }
  };

  // LEGACY: Handle old idea generation
  const handleGenerate = async (prompt: string) => {
    setOverallState('running');
    setGenerationPrompt(prompt);

    try {
      const result = await generateIdeasForCompany({
        companyId,
        prompt,
        context: {
          companyName: company.name,
          website: company.website,
          industry: company.industry,
          blogUrl: company.blogAnalysis?.blogUrl || undefined,
        },
      });

      const generatedIdeas: GeneratedIdea[] = result.ideas.map((idea) => ({
        ...idea,
        approved: false,
        rejected: false,
        feedback: undefined,
        createdAt: new Date(),
      }));

      setIdeas(generatedIdeas);
      setSessionId(result.sessionId);
      setCostInfo(result.costInfo);

      const costMessage = result.costInfo ? ` (${formatCost(result.costInfo)})` : '';
      showSnackbar(`Successfully generated ${result.totalGenerated} ideas${costMessage}`, 'success');
    } catch (error: any) {
      console.error('Error generating ideas:', error);
      showSnackbar(error.message || 'Failed to generate ideas', 'error');
      setOverallState('empty');
    }
  };

  const handleApprove = (ideaId: string) => {
    setIdeas((prev) => prev.map((idea) => idea.id === ideaId ? { ...idea, approved: true, rejected: false } : idea));
  };

  const handleReject = (ideaId: string) => {
    setIdeas((prev) => prev.map((idea) => idea.id === ideaId ? { ...idea, approved: false, rejected: true } : idea));
  };

  const handleFeedbackChange = (ideaId: string, feedback: string) => {
    setIdeas((prev) => prev.map((idea) => idea.id === ideaId ? { ...idea, feedback } : idea));
  };

  const handleGeneralFeedbackChange = (feedback: string) => {
    setGeneralFeedback(feedback);
  };

  const handleSave = async () => {
    try {
      await saveApprovedIdeas(companyId, ideas, generalFeedback, generationPrompt, sessionId);
      const approvedCount = ideas.filter((i) => i.approved).length;
      showSnackbar(`Successfully saved ${approvedCount} approved idea${approvedCount !== 1 ? 's' : ''}`, 'success');
    } catch (error: any) {
      console.error('Error saving ideas:', error);
      showSnackbar(error.message || 'Failed to save ideas', 'error');
    }
  };

  const handleRegenerate = () => {
    setIdeas([]);
    setGeneralFeedback('');
    setSessionId('');
    setCostInfo(null);
    setOverallState('empty');
    showSnackbar('Ready to generate new ideas', 'info');
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Handle choosing an idea
  const handleChooseIdea = async (ideaTitle: string, sourceVersion: 'v1' | 'v2' | 'v3' = 'v1') => {
    try {
      const companyRef = doc(db, 'entities', companyId);
      await updateDoc(companyRef, {
        'customFields.chosen_idea': ideaTitle,
        'customFields.chosen_idea_version': sourceVersion,
        pendingOfferApproval: false,
        pendingOfferApprovalAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setChosenIdea(ideaTitle);
      setChosenIdeaVersion(sourceVersion);
      showSnackbar(`Idea chosen from ${sourceVersion.toUpperCase()}!`, 'success');
    } catch (error: any) {
      console.error('Error choosing idea:', error);
      showSnackbar(error.message || 'Failed to save choice', 'error');
    }
  };

  // Handle clearing the chosen idea
  const handleClearChoice = async () => {
    try {
      const companyRef = doc(db, 'entities', companyId);
      const hasIdeas = (analysisResult?.ideas && analysisResult.ideas.length > 0) ||
                       (analysisResult?.v2?.ideas && analysisResult.v2.ideas.length > 0) ||
                       (analysisResult?.v3?.ideas && analysisResult.v3.ideas.length > 0);

      await updateDoc(companyRef, {
        'customFields.chosen_idea': null,
        'customFields.chosen_idea_version': null,
        pendingOfferApproval: hasIdeas,
        pendingOfferApprovalAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setChosenIdea(null);
      setChosenIdeaVersion(null);
      showSnackbar('Choice cleared', 'info');
    } catch (error: any) {
      console.error('Error clearing choice:', error);
      showSnackbar(error.message || 'Failed to clear choice', 'error');
    }
  };

  // ========================================
  // Render
  // ========================================

  const renderContent = () => {
    // Empty state — show Start Analysis button
    if (overallState === 'empty') {
      return (
        <Box
          sx={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            p: 4,
            mb: 3,
            border: '1px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
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
            Company Offer Analysis
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: '#64748b', fontSize: '0.875rem', mb: 3, maxWidth: '600px', mx: 'auto' }}
          >
            AI-powered analysis that identifies the company type, business model, and generates 5 tailored blog ideas with detailed insights.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<AnalyzeIcon />}
            onClick={handleStartAnalysis}
            disabled={!company.website && !company.customFields?.website_blog_link && !company.blogAnalysis?.blogUrl}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 600,
              textTransform: 'none',
              padding: '14px 32px',
              fontSize: '1rem',
              borderRadius: 2,
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)',
              },
              '&:disabled': { background: '#e2e8f0', color: '#94a3b8' },
              transition: 'all 0.2s ease',
            }}
          >
            Start Analysis
          </Button>
          {!company.website && !company.customFields?.website_blog_link && !company.blogAnalysis?.blogUrl && (
            <Typography variant="caption" sx={{ display: 'block', color: '#ef4444', mt: 1, fontSize: '0.75rem' }}>
              Company website or blog URL is required for analysis
            </Typography>
          )}
        </Box>
      );
    }

    // Analyzing state — Step 1 company analysis spinner
    if (overallState === 'analyzing') {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid #e2e8f0',
          }}
        >
          <CircularProgress size={60} thickness={4} sx={{ color: '#667eea', mb: 3 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>
            Step 1: Analyzing Company Type...
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', maxWidth: '500px' }}>
            Identifying {company.name}'s company type, business model, and AI capabilities. This may take 30-60 seconds.
          </Typography>
        </Box>
      );
    }

    // Running or Complete — show company analysis + triple tabs
    return (
      <Box>
        {/* Header with Regenerate Button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Analysis Results
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRegenerateAnalysis}
            sx={{
              borderColor: '#667eea',
              color: '#667eea',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { borderColor: '#5568d3', backgroundColor: 'rgba(102, 126, 234, 0.04)' },
            }}
          >
            Run New Analysis
          </Button>
        </Box>

        {/* Company Analysis Results */}
        {analysisResult?.companyAnalysis && (
          <CompanyAnalysisResults analysis={analysisResult.companyAnalysis} />
        )}

        {/* Triple Version Tabs — shown during both running and complete states */}
        <BlogIdeasDisplayTriple
          v1Ideas={analysisResult?.ideas || []}
          v1Status={v1Status}
          v2Ideas={analysisResult?.v2?.ideas || []}
          v2Status={v2Status}
          v2ValidationResults={analysisResult?.v2?.validationResults}
          v2MatchedConcepts={analysisResult?.v2?.matchedConcepts}
          v2StageResults={v2StageResults}
          v3Ideas={analysisResult?.v3?.ideas || []}
          v3Status={v3Status}
          v3Debug={analysisResult?.v3?.debug}
          onOpenV3Debug={() => setIsV3DebugOpen(true)}
          chosenIdeaTitle={chosenIdea}
          chosenIdeaVersion={chosenIdeaVersion}
          onChooseIdea={handleChooseIdea}
          onClearChoice={handleClearChoice}
        />

        {/* Cost Info */}
        {analysisResult?.costInfo && (
          <Box
            sx={{
              mt: 4,
              p: 2,
              background: 'rgba(102, 126, 234, 0.08)',
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
              Analysis Cost: {formatCost(analysisResult.costInfo)}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <>
      {renderContent()}

      {/* V3 Debug Dialog */}
      <Dialog open={isV3DebugOpen} onClose={() => setIsV3DebugOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>V3 Stage Debug Trace</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1.5, color: '#64748b' }}>
            Full post-run V3 stage artifacts (concept sourcing, matching, generation attempts, and validation attempts).
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0, p: 2,
              backgroundColor: '#0f172a', color: '#e2e8f0',
              borderRadius: 1.5, overflowX: 'auto',
              fontSize: '12px', lineHeight: 1.45,
            }}
          >
            {JSON.stringify(analysisResult?.v3?.debug || {}, null, 2)}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsV3DebugOpen(false)} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
