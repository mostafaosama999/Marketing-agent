import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../app/config/firebase';
import { ResearchSession } from '../app/types/research';

/**
 * Listen to research session updates in real-time
 */
export function subscribeToSession(
  sessionId: string,
  callback: (session: ResearchSession | null) => void
): Unsubscribe {
  const sessionRef = doc(db, 'research_sessions', sessionId);

  return onSnapshot(sessionRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      // Convert Firestore timestamps to Date objects
      const session: ResearchSession = {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate() || undefined,
      } as ResearchSession;
      callback(session);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error listening to session:', error);
    callback(null);
  });
}

/**
 * Listen to recent research sessions
 */
export function subscribeToRecentSessions(
  callback: (sessions: ResearchSession[]) => void,
  limitCount = 10
): Unsubscribe {
  const sessionsRef = collection(db, 'research_sessions');
  const q = query(
    sessionsRef,
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const sessions: ResearchSession[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      sessions.push({
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate() || undefined,
      } as ResearchSession);
    });
    callback(sessions);
  }, (error) => {
    console.error('Error listening to sessions:', error);
    callback([]);
  });
}