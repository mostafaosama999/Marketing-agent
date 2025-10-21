// Migration utility for adding stateDurations to existing timeline records
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase/firestore';
import { TicketTimeline } from '../types';

export const migrateTimelineData = async () => {
   ('Starting timeline migration...');

  try {
    // Migrate task timelines
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    let tasksMigrated = 0;

    for (const taskDoc of tasksSnapshot.docs) {
      try {
        const timelineSnapshot = await getDocs(collection(db, 'tasks', taskDoc.id, 'timeline'));
        for (const timelineDoc of timelineSnapshot.docs) {
          const timeline = timelineDoc.data() as TicketTimeline;

          // Check if stateDurations already exists
          if (!timeline.stateDurations) {
            // Initialize stateDurations with zeros for all states that exist in stateHistory
            const stateDurations: any = {};
            Object.keys(timeline.stateHistory).forEach(status => {
              stateDurations[status] = 0;
            });

            await updateDoc(doc(db, 'tasks', taskDoc.id, 'timeline', timelineDoc.id), {
              stateDurations
            });

            tasksMigrated++;
             (`Migrated task timeline: ${taskDoc.id}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to migrate task ${taskDoc.id}:`, error);
      }
    }

    // Migrate ticket timelines
    const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
    let ticketsMigrated = 0;

    for (const ticketDoc of ticketsSnapshot.docs) {
      try {
        const timelineSnapshot = await getDocs(collection(db, 'tickets', ticketDoc.id, 'timeline'));
        for (const timelineDoc of timelineSnapshot.docs) {
          const timeline = timelineDoc.data() as TicketTimeline;

          // Check if stateDurations already exists
          if (!timeline.stateDurations) {
            // Initialize stateDurations with zeros for all states that exist in stateHistory
            const stateDurations: any = {};
            Object.keys(timeline.stateHistory).forEach(status => {
              stateDurations[status] = 0;
            });

            await updateDoc(doc(db, 'tickets', ticketDoc.id, 'timeline', timelineDoc.id), {
              stateDurations
            });

            ticketsMigrated++;
             (`Migrated ticket timeline: ${ticketDoc.id}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to migrate ticket ${ticketDoc.id}:`, error);
      }
    }

     (`Migration completed! Tasks migrated: ${tasksMigrated}, Tickets migrated: ${ticketsMigrated}`);
    return { tasksMigrated, ticketsMigrated };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Function to check if migration is needed
export const checkMigrationStatus = async (): Promise<{ needsMigration: boolean; totalRecords: number; migratedRecords: number }> => {
  let totalRecords = 0;
  let migratedRecords = 0;

  try {
    // Check task timelines
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    for (const taskDoc of tasksSnapshot.docs) {
      try {
        const timelineSnapshot = await getDocs(collection(db, 'tasks', taskDoc.id, 'timeline'));
        for (const timelineDoc of timelineSnapshot.docs) {
          totalRecords++;
          const timeline = timelineDoc.data() as TicketTimeline;
          if (timeline.stateDurations) {
            migratedRecords++;
          }
        }
      } catch (error) {
        // Ignore errors for individual records
      }
    }

    // Check ticket timelines
    const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
    for (const ticketDoc of ticketsSnapshot.docs) {
      try {
        const timelineSnapshot = await getDocs(collection(db, 'tickets', ticketDoc.id, 'timeline'));
        for (const timelineDoc of timelineSnapshot.docs) {
          totalRecords++;
          const timeline = timelineDoc.data() as TicketTimeline;
          if (timeline.stateDurations) {
            migratedRecords++;
          }
        }
      } catch (error) {
        // Ignore errors for individual records
      }
    }

    return {
      needsMigration: migratedRecords < totalRecords,
      totalRecords,
      migratedRecords
    };
  } catch (error) {
    console.error('Error checking migration status:', error);
    return { needsMigration: false, totalRecords: 0, migratedRecords: 0 };
  }
};