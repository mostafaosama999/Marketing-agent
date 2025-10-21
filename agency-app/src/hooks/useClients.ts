// src/hooks/useClients.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
} from 'firebase/firestore';
import { db } from '../services/firebase/firestore';
import { guidelinesService, GuidelinesDocument } from '../services/api/guidelines';
import { ticketsService } from '../services/api/tickets';
import { ticketContentService } from '../services/api/ticketSubcollections';
import { GuidelineSection } from '../types/client';
import { TicketStatus, TicketPriority } from '../types';

export interface ClientCompensation {
  blogRate?: number;
  tutorialRate?: number;
  caseStudyRate?: number;
  whitepaperRate?: number;
  socialMediaRate?: number;
  emailRate?: number;
  landingPageRate?: number;
  otherRate?: number;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  website: string;
  status: 'active' | 'inactive' | 'prospect';
  contractValue: number;
  monthlyRevenue: number;
  startDate: string;
  notes: string;
  createdAt?: string; // ISO timestamp for onboarding tracking
  guidelines?: ClientGuidelines;
  compensation?: ClientCompensation;
}

export interface ClientGuidelines {
  // New section-based format
  sections?: GuidelineSection[];
  
  // Legacy fields for backward compatibility
  brandVoice?: string;
  targetAudience?: string;
  contentStyle?: string;
  keyMessages?: string[];
  avoidTopics?: string[];
  preferredFormats?: string[];
  seoKeywords?: string[];
  competitorAnalysis?: string;
  content?: string; // Legacy single content field
  updatedAt?: string;
}

export interface ArticleIdea {
  id: string;
  clientId: string;
  title: string;
  description: string;
  targetMonth: string;
  status: 'idea' | 'assigned' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  estimatedWordCount: number;
  targetKeywords: string[];
  category: string;
  createdAt: any;
  assignedTo?: string;
  taskId?: string;
}

export type ClientFormData = Omit<Client, 'id'>;
export type ArticleIdeaFormData = Omit<ArticleIdea, 'id' | 'clientId' | 'createdAt'>;

interface UseClientReturn {
  // Client data
  client: Client | null;
  clients: Client[];
  articleIdeas: ArticleIdea[];
  guidelines: GuidelinesDocument | null;
  
  // Loading states
  loading: boolean;
  clientLoading: boolean;
  articleIdeasLoading: boolean;
  guidelinesLoading: boolean;
  
  // Error handling
  error: string | null;
  
  // Client operations
  addClient: (clientData: ClientFormData) => Promise<void>;
  updateClient: (clientId: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  
  // Guidelines operations
  updateGuidelines: (clientId: string, guidelines: ClientGuidelines) => Promise<void>;
  getSectionsForChecklist: (clientId: string) => Promise<GuidelineSection[]>;
  
  // Article idea operations
  addArticleIdea: (clientId: string, ideaData: ArticleIdeaFormData) => Promise<void>;
  updateArticleIdea: (clientId: string, ideaId: string, updates: Partial<ArticleIdea>) => Promise<void>;
  deleteArticleIdea: (clientId: string, ideaId: string) => Promise<void>;
  convertToTicket: (clientId: string, article: ArticleIdea) => Promise<void>;
  
  // Computed values
  activeClients: Client[];
  totalExpectedRevenue: number;
}

export const useClient = (clientId?: string): UseClientReturn => {
  const loadArticleIdeas = !!clientId;
  const loadGuidelines = !!clientId;
  
  // State
  const [client, setClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [articleIdeas, setArticleIdeas] = useState<ArticleIdea[]>([]);
  const [guidelines, setGuidelines] = useState<GuidelinesDocument | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [clientLoading, setClientLoading] = useState(!!clientId);
  const [articleIdeasLoading, setArticleIdeasLoading] = useState(loadArticleIdeas);
  const [guidelinesLoading, setGuidelinesLoading] = useState(loadGuidelines);
  
  // Error handling
  const [error, setError] = useState<string | null>(null);

  // Helper to handle async operations with error catching
  const withErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T | null> => {
    try {
      setError(null);
      return await operation();
    } catch (err) {
      console.error(errorMessage, err);
      setError(err instanceof Error ? err.message : errorMessage);
      return null;
    }
  }, []);

  // Load all clients
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'clients'),
      (snapshot) => {
        const clientsData: Client[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Client));
        
        setClients(clientsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching clients:', err);
        setError('Failed to load clients');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Load specific client if clientId provided
  useEffect(() => {
    if (!clientId) {
      setClientLoading(false);
      return;
    }

    const fetchClient = async () => {
      try {
        setClientLoading(true);
        const clientDoc = await getDoc(doc(db, 'clients', clientId));
        
        if (clientDoc.exists()) {
          setClient({ id: clientDoc.id, ...clientDoc.data() } as Client);
        } else {
          setError('Client not found');
        }
      } catch (err) {
        console.error('Error fetching client:', err);
        setError('Failed to load client');
      } finally {
        setClientLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  // Load guidelines if requested
  useEffect(() => {
    if (!clientId || !loadGuidelines) {
      setGuidelinesLoading(false);
      return;
    }

    const unsubscribe = guidelinesService.subscribeToGuidelines(clientId, (guidelinesData) => {
      setGuidelines(guidelinesData);
      setGuidelinesLoading(false);
    });

    return () => unsubscribe();
  }, [clientId, loadGuidelines]);

  // Load article ideas if requested
  useEffect(() => {
    if (!clientId || !loadArticleIdeas) {
      setArticleIdeasLoading(false);
      return;
    }

    const articleIdeasRef = collection(db, 'clients', clientId, 'articleIdeas');
    const q = query(articleIdeasRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ideas: ArticleIdea[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ArticleIdea));
        
        setArticleIdeas(ideas);
        setArticleIdeasLoading(false);
      },
      (err) => {
        console.error('Error fetching article ideas:', err);
        setError('Failed to load article ideas');
        setArticleIdeasLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId, loadArticleIdeas]);

  // Client operations
  const addClient = useCallback(async (clientData: any): Promise<void> => {
    await withErrorHandling(
      async () => {
        // Prepare the client data for Firestore
        const firestoreData: any = {
          name: clientData.name,
          industry: clientData.industry || '',
          contactEmail: clientData.contactEmail || '',
          contactPhone: clientData.contactPhone || '',
          address: clientData.address || '',
          website: clientData.website || '',
          status: clientData.status || 'active',
          contractValue: clientData.contractValue || 0,
          monthlyRevenue: clientData.monthlyRevenue || 0,
          startDate: clientData.startDate || new Date().toISOString().split('T')[0],
          notes: clientData.notes || '',
          createdAt: new Date().toISOString(), // For onboarding tracking
          updatedAt: new Date()
        };

        // Add compensation if provided, but filter out undefined values
        if (clientData.compensation && Object.keys(clientData.compensation).length > 0) {
          const cleanedCompensation: any = {};
          
          // Only include compensation rates that have actual values (not undefined/null)
          Object.keys(clientData.compensation).forEach(key => {
            const value = clientData.compensation[key];
            if (value !== undefined && value !== null && value !== '') {
              cleanedCompensation[key] = value;
            }
          });
          
          // Only add compensation if there are actual rates
          if (Object.keys(cleanedCompensation).length > 0) {
            firestoreData.compensation = cleanedCompensation;
          }
        }

        await addDoc(collection(db, 'clients'), firestoreData);
      },
      'Failed to add client'
    );
  }, [withErrorHandling]);

  const updateClient = useCallback(async (
    clientId: string, 
    updates: Partial<Client>
  ): Promise<void> => {
    await withErrorHandling(
      () => updateDoc(doc(db, 'clients', clientId), {
        ...updates,
        updatedAt: new Date()
      }),
      'Failed to update client'
    );
  }, [withErrorHandling]);

  const deleteClient = useCallback(async (clientId: string): Promise<void> => {
    await withErrorHandling(
      () => deleteDoc(doc(db, 'clients', clientId)),
      'Failed to delete client'
    );
  }, [withErrorHandling]);

  // Guidelines operations
  const updateGuidelines = useCallback(async (
    clientId: string, 
    guidelinesData: ClientGuidelines
  ): Promise<void> => {
    await withErrorHandling(
      async () => {
        if (guidelines && guidelines.id) {
          // Update existing guidelines
          await guidelinesService.updateGuidelines(clientId, guidelines.id, guidelinesData);
        } else {
          // Create new guidelines
          await guidelinesService.createGuidelines(clientId, guidelinesData);
        }
      },
      'Failed to update guidelines'
    );
  }, [withErrorHandling, guidelines]);

  // Get sections for checklist functionality
  const getSectionsForChecklist = useCallback(async (
    clientId: string
  ): Promise<GuidelineSection[]> => {
    return await guidelinesService.getSectionsForChecklist(clientId);
  }, []);

  // Article idea operations
  const addArticleIdea = useCallback(async (
    clientId: string, 
    ideaData: ArticleIdeaFormData
  ): Promise<void> => {
    await withErrorHandling(
      () => addDoc(collection(db, 'clients', clientId, 'articleIdeas'), {
        ...ideaData,
        clientId,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      'Failed to add article idea'
    );
  }, [withErrorHandling]);

  const updateArticleIdea = useCallback(async (
    clientId: string, 
    ideaId: string, 
    updates: Partial<ArticleIdea>
  ): Promise<void> => {
    await withErrorHandling(
      () => updateDoc(doc(db, 'clients', clientId, 'articleIdeas', ideaId), {
        ...updates,
        updatedAt: new Date()
      }),
      'Failed to update article idea'
    );
  }, [withErrorHandling]);

  const deleteArticleIdea = useCallback(async (
    clientId: string, 
    ideaId: string
  ): Promise<void> => {
    await withErrorHandling(
      () => deleteDoc(doc(db, 'clients', clientId, 'articleIdeas', ideaId)),
      'Failed to delete article idea'
    );
  }, [withErrorHandling]);

  const convertToTicket = useCallback(async (
    clientId: string,
    article: ArticleIdea,
    createdBy?: string
  ): Promise<void> => {
    const clientName = clients.find(c => c.id === clientId)?.name ||
                      client?.name ||
                      'Unknown Client';

    await withErrorHandling(
      async () => {
        // Create ticket with core fields only
        const ticketData = {
          title: article.title,
          description: article.description,
          clientName,
          writerName: '',
          status: 'todo' as TicketStatus,
          priority: article.priority as TicketPriority,
          type: 'blog' as 'blog' | 'tutorial',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          articleIdeaId: article.id,
          assignedTo: '',
          aiReviewCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const ticketId = await ticketsService.createTicket(ticketData, createdBy);

        // Initialize content subcollection with additional fields
        await ticketContentService.updateContent(ticketId, {
          estimatedWordCount: article.estimatedWordCount,
          targetKeywords: article.targetKeywords,
          category: article.category,
          labels: ['content', 'article']
        });

        // Update article idea
        await updateDoc(doc(db, 'clients', clientId, 'articleIdeas', article.id), {
          status: 'assigned',
          ticketId: ticketId,
          updatedAt: new Date(),
        });
      },
      'Failed to convert article idea to task'
    );
  }, [withErrorHandling, clients, client]);

  // Computed values
  const activeClients = clients.filter(client => client.status === 'active');
  const totalExpectedRevenue = clients.reduce((sum, client) => sum + (client.monthlyRevenue || 0), 0);

  return {
    // Data
    client,
    clients,
    articleIdeas,
    guidelines,
    
    // Loading states
    loading,
    clientLoading,
    articleIdeasLoading,
    guidelinesLoading,
    
    // Error handling
    error,
    
    // Operations
    addClient,
    updateClient,
    deleteClient,
    updateGuidelines,
    getSectionsForChecklist,
    addArticleIdea,
    updateArticleIdea,
    deleteArticleIdea,
    convertToTicket,
    
    // Computed values
    activeClients,
    totalExpectedRevenue,
  };
};