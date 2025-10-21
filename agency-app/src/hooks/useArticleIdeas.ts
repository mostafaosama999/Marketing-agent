// src/hooks/useArticleIdeas.ts
import { useState, useEffect } from 'react';
import { articleIdeasService } from '../services/api/articleIdeas';
import { ticketsService } from '../services/api/tickets';
import { ticketContentService } from '../services/api/ticketSubcollections';
import { ArticleIdea, Ticket, TicketStatus, TicketPriority } from '../types';

export const useArticleIdeas = (clientId: string) => {
  const [articleIdeas, setArticleIdeas] = useState<ArticleIdea[]>([]);

  useEffect(() => {
    if (!clientId) return;

    const unsubscribe = articleIdeasService.subscribeToArticleIdeas(clientId, (ideas) => {
      setArticleIdeas(ideas);
    });

    return () => unsubscribe();
  }, [clientId]);

  const addArticleIdea = async (ideaData: Omit<ArticleIdea, 'id' | 'clientId' | 'createdAt'>) => {
    try {
      await articleIdeasService.createArticleIdea(clientId, ideaData);
    } catch (error) {
      console.error('Error in useArticleIdeas.addArticleIdea:', error);
      throw error;
    }
  };

  const editArticleIdea = async (ideaData: ArticleIdea) => {
    try {
      await articleIdeasService.updateArticleIdea(clientId, ideaData);
    } catch (error) {
      console.error('Error in useArticleIdeas.editArticleIdea:', error);
      throw error;
    }
  };

  const deleteArticleIdea = async (ideaId: string) => {
    if (window.confirm('Are you sure you want to delete this article idea?')) {
      try {
        await articleIdeasService.deleteArticleIdea(clientId, ideaId);
      } catch (error) {
        console.error('Error in useArticleIdeas.deleteArticleIdea:', error);
        throw error;
      }
    }
  };

  const convertToTicket = async (article: ArticleIdea, clientName: string, createdBy?: string) => {
    try {
      // Calculate due date (7 days from now as default)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      // Core ticket data only
      const ticketData: Omit<Ticket, 'id'> = {
        title: article.title,
        description: article.description,
        clientName,
        writerName: '', // Will be assigned later by manager
        status: 'todo' as TicketStatus,
        priority: article.priority as TicketPriority,
        type: (article.type || 'blog') as 'blog' | 'tutorial',
        dueDate: dueDate.toISOString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        articleIdeaId: article.id,
        assignedTo: '', // Will be assigned by manager
        aiReviewCompleted: false
      };

      const ticketId = await ticketsService.createTicket(ticketData, createdBy);

      // Initialize content subcollection with additional data
      if (article.estimatedWordCount || article.targetKeywords || article.category) {
        await ticketContentService.updateContent(ticketId, {
          estimatedWordCount: article.estimatedWordCount,
          targetKeywords: article.targetKeywords,
          category: article.category,
          labels: ['content', 'article']
        });
      }

      // Update the article idea to link it to the ticket
      await articleIdeasService.updateArticleIdea(clientId, {
        ...article,
        status: 'assigned',
        ticketId,
      });
    } catch (error) {
      console.error('Error converting article idea to ticket:', error);
      throw error;
    }
  };

  const groupArticlesByMonth = () => {
    const grouped: { [month: string]: ArticleIdea[] } = {};

    articleIdeas.forEach(article => {
      const month = article.targetMonth || 'unscheduled';
      if (!grouped[month]) {
        grouped[month] = [];
      }
      grouped[month].push(article);
    });

    return grouped;
  };

  return {
    articleIdeas,
    addArticleIdea,
    editArticleIdea,
    deleteArticleIdea,
    convertToTicket,
    groupArticlesByMonth,
  };
};