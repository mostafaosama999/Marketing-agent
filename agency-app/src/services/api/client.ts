// src/services/api/clients.ts
import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../../services/firebase/firestore';
import { Client } from '../../types';

export const clientsService = {
  // Subscribe to all clients
  subscribeToClients: (callback: (clients: Client[]) => void) => {
    return onSnapshot(collection(db, 'clients'), (snapshot) => {
      const clients: Client[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Client));
      callback(clients);
    });
  },

  // Get single client
  getClient: async (clientId: string): Promise<Client | null> => {
    try {
      const clientDoc = await getDoc(doc(db, 'clients', clientId));
      if (clientDoc.exists()) {
        return { id: clientDoc.id, ...clientDoc.data() } as Client;
      }
      return null;
    } catch (error) {
      console.error('Error fetching client:', error);
      throw error;
    }
  },

  // Create new client
  createClient: async (clientData: Omit<Client, 'id'>): Promise<void> => {
    try {
      await addDoc(collection(db, 'clients'), clientData);
    } catch (error) {
      console.error('Error adding client:', error);
      throw error;
    }
  },

  // Update client
  updateClient: async (clientData: Client): Promise<void> => {
    try {
      const { id, ...updateData } = clientData;
      await updateDoc(doc(db, 'clients', id), updateData);
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  },

  // Delete client
  deleteClient: async (clientId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'clients', clientId));
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  },

  // Update client guidelines
  updateGuidelines: async (clientId: string, guidelines: Client['guidelines']): Promise<void> => {
    try {
      const updatedGuidelines = {
        ...guidelines,
        updatedAt: new Date().toISOString(),
      };
      
      await updateDoc(doc(db, 'clients', clientId), {
        guidelines: updatedGuidelines,
      });
    } catch (error) {
      console.error('Error updating guidelines:', error);
      throw error;
    }
  }
};