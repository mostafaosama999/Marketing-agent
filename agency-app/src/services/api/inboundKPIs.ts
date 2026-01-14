/**
 * Inbound KPIs Service
 *
 * Handles CRUD operations for manual inbound marketing KPIs in Firestore.
 * These are manually entered metrics like website quality, LinkedIn quality,
 * impressions, posts, and followers.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { InboundKPIData } from '../../types/inboundKPIs';

const COLLECTION_NAME = 'inboundKPIs';

/**
 * Convert Firestore document to InboundKPIData
 */
function convertToInboundKPI(id: string, data: any): InboundKPIData {
  return {
    month: id,
    monthLabel: data.monthLabel,
    websiteQuality: data.websiteQuality,
    linkedInQuality: data.linkedInQuality,
    impressions: data.impressions,
    posts: data.posts,
    followers: data.followers,
    updatedAt: data.updatedAt?.toDate?.() || (data.updatedAt ? new Date(data.updatedAt) : undefined),
    updatedBy: data.updatedBy,
    createdAt: data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : undefined),
    createdBy: data.createdBy,
  };
}

/**
 * Get readable month label from month key
 */
function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

/**
 * Get a single month's inbound KPI data
 */
export async function getInboundKPI(month: string): Promise<InboundKPIData | null> {
  const docRef = doc(db, COLLECTION_NAME, month);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return convertToInboundKPI(docSnap.id, docSnap.data());
}

/**
 * Get all inbound KPIs
 */
export async function getAllInboundKPIs(): Promise<InboundKPIData[]> {
  const collectionRef = collection(db, COLLECTION_NAME);
  const q = query(collectionRef, orderBy('month', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => convertToInboundKPI(doc.id, doc.data()));
}

/**
 * Subscribe to inbound KPIs with real-time updates
 */
export function subscribeToInboundKPIs(
  callback: (kpis: InboundKPIData[]) => void
): Unsubscribe {
  const collectionRef = collection(db, COLLECTION_NAME);
  const q = query(collectionRef, orderBy('month', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const kpis = snapshot.docs.map(doc => convertToInboundKPI(doc.id, doc.data()));
      callback(kpis);
    },
    (error) => {
      console.error('Error listening to inbound KPIs:', error);
      callback([]);
    }
  );
}

/**
 * Create or update inbound KPI for a specific month
 */
export async function updateInboundKPI(
  month: string,
  data: Partial<InboundKPIData>,
  userId: string
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, month);
  const docSnap = await getDoc(docRef);

  const updateData: any = {
    websiteQuality: data.websiteQuality ?? null,
    linkedInQuality: data.linkedInQuality ?? null,
    impressions: data.impressions ?? null,
    posts: data.posts ?? null,
    followers: data.followers ?? null,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  };

  if (docSnap.exists()) {
    // Update existing document
    await updateDoc(docRef, updateData);
  } else {
    // Create new document
    await setDoc(docRef, {
      ...updateData,
      month,
      monthLabel: getMonthLabel(month),
      createdAt: Timestamp.now(),
      createdBy: userId,
    });
  }
}

/**
 * Get inbound KPIs as a map keyed by month for easy lookup
 */
export async function getInboundKPIsMap(): Promise<Record<string, InboundKPIData>> {
  const kpis = await getAllInboundKPIs();
  const map: Record<string, InboundKPIData> = {};

  for (const kpi of kpis) {
    map[kpi.month] = kpi;
  }

  return map;
}
