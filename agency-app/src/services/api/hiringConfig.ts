// src/services/api/hiringConfig.ts
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firestore';

const HIRING_CONFIG_DOC = 'hiringConfig/default';

export interface HiringConfig {
  currentJobPost: string;
}

export async function getHiringConfig(): Promise<HiringConfig> {
  const ref = doc(db, HIRING_CONFIG_DOC);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as HiringConfig;
  }
  return { currentJobPost: '' };
}

export async function updateHiringConfig(config: Partial<HiringConfig>): Promise<void> {
  const ref = doc(db, HIRING_CONFIG_DOC);
  await setDoc(ref, config, { merge: true });
}
