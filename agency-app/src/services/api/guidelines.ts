// src/services/api/guidelines.ts
import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy,
  query,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../../services/firebase/firestore';
import { ClientGuidelines, GuidelineSection } from '../../types';

export interface GuidelinesDocument extends ClientGuidelines {
  id: string;
  clientId: string;
  createdAt: any;
  updatedAt: any;
}

export const guidelinesService = {
  // Subscribe to guidelines for a client
  subscribeToGuidelines: (clientId: string, callback: (guidelines: GuidelinesDocument | null) => void) => {
    const guidelinesRef = collection(db, 'clients', clientId, 'guidelines');
    const q = query(guidelinesRef, orderBy('createdAt', 'desc'), limit(1));

    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const guidelines: GuidelinesDocument = {
          id: doc.id,
          ...doc.data()
        } as GuidelinesDocument;
        callback(guidelines);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error fetching guidelines:', error);
      callback(null);
    });
  },

  // Get current guidelines
  getGuidelines: async (clientId: string): Promise<GuidelinesDocument | null> => {
    try {
      const guidelinesRef = collection(db, 'clients', clientId, 'guidelines');
      const q = query(guidelinesRef, orderBy('createdAt', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as GuidelinesDocument;
      }
      return null;
    } catch (error) {
      console.error('Error getting guidelines:', error);
      return null;
    }
  },

  // Create new guidelines with sections
  createGuidelines: async (
    clientId: string, 
    guidelinesData: Omit<ClientGuidelines, 'updatedAt'>
  ): Promise<string> => {
    try {
      const guidelinesRef = collection(db, 'clients', clientId, 'guidelines');
      const docRef = await addDoc(guidelinesRef, {
        ...guidelinesData,
        clientId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding guidelines:', error);
      throw error;
    }
  },

  // Update guidelines with sections
  updateGuidelines: async (clientId: string, guidelinesId: string, guidelinesData: ClientGuidelines): Promise<void> => {
    try {
      const guidelinesRef = doc(db, 'clients', clientId, 'guidelines', guidelinesId);
      await updateDoc(guidelinesRef, {
        ...guidelinesData,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating guidelines:', error);
      throw error;
    }
  },

  // Get sections for checklist (from the main guidelines document)
  getSectionsForChecklist: async (clientId: string): Promise<GuidelineSection[]> => {
    try {
      const guidelines = await guidelinesService.getGuidelines(clientId);
      return guidelines?.sections || [];
    } catch (error) {
      console.error('Error getting sections for checklist:', error);
      return [];
    }
  },

  // Delete guidelines
  deleteGuidelines: async (clientId: string, guidelinesId: string): Promise<void> => {
    try {
      const guidelinesRef = doc(db, 'clients', clientId, 'guidelines', guidelinesId);
      await deleteDoc(guidelinesRef);
    } catch (error) {
      console.error('Error deleting guidelines:', error);
      throw error;
    }
  }
};