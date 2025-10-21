// src/services/api/articleIdeas.ts
import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy,
  query 
} from 'firebase/firestore';
import { db } from '../../services/firebase/firestore';
import { ArticleIdea } from '../../types';

export const articleIdeasService = {
  // Subscribe to article ideas for a client
  subscribeToArticleIdeas: (clientId: string, callback: (ideas: ArticleIdea[]) => void) => {
    const articleIdeasRef = collection(db, 'clients', clientId, 'articleIdeas');
    const q = query(articleIdeasRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const ideas: ArticleIdea[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ArticleIdea));
      callback(ideas);
    }, (error) => {
      console.error('Error fetching article ideas:', error);
    });
  },

  // Create new article idea
  createArticleIdea: async (
    clientId: string, 
    ideaData: Omit<ArticleIdea, 'id' | 'clientId' | 'createdAt'>
  ): Promise<void> => {
    try {
      const articleIdeasRef = collection(db, 'clients', clientId, 'articleIdeas');
      await addDoc(articleIdeasRef, {
        ...ideaData,
        clientId,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Error adding article idea:', error);
      throw error;
    }
  },

  // Update article idea
  updateArticleIdea: async (clientId: string, ideaData: ArticleIdea): Promise<void> => {
    try {
      const { id, ...updateData } = ideaData;
      const articleRef = doc(db, 'clients', clientId, 'articleIdeas', id);
      await updateDoc(articleRef, {
        ...updateData,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating article idea:', error);
      throw error;
    }
  },

  // Delete article idea
  deleteArticleIdea: async (clientId: string, ideaId: string): Promise<void> => {
    try {
      const articleRef = doc(db, 'clients', clientId, 'articleIdeas', ideaId);
      await deleteDoc(articleRef);
    } catch (error) {
      console.error('Error deleting article idea:', error);
      throw error;
    }
  }
};