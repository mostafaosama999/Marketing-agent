// src/services/api/hiringConfig.ts
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';

const HIRING_CONFIG_DOC = 'hiringConfig/default';

export interface HiringConfig {
  currentJobPost: string;
  recruiterOutreachCount?: number;
  hiringFeesFrozen?: boolean;
  hiringFeesFrozenAt?: Date;
}

export async function getHiringConfig(): Promise<HiringConfig> {
  const ref = doc(db, HIRING_CONFIG_DOC);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    const frozenAtRaw = data.hiringFeesFrozenAt;
    const frozenAt = frozenAtRaw instanceof Timestamp
      ? frozenAtRaw.toDate()
      : frozenAtRaw instanceof Date
        ? frozenAtRaw
        : undefined;
    return {
      currentJobPost: data.currentJobPost ?? '',
      recruiterOutreachCount: data.recruiterOutreachCount,
      hiringFeesFrozen: data.hiringFeesFrozen ?? false,
      hiringFeesFrozenAt: frozenAt,
    };
  }
  return { currentJobPost: '' };
}

export async function updateHiringConfig(config: Partial<HiringConfig>): Promise<void> {
  const ref = doc(db, HIRING_CONFIG_DOC);
  await setDoc(ref, config, { merge: true });
}
