// src/services/api/hiringConfig.ts
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { ChannelFreezeMap, FreezableChannelKey, FREEZABLE_CHANNEL_KEYS } from '../../utils/hiringCosts';

const HIRING_CONFIG_DOC = 'hiringConfig/default';

export interface HiringConfig {
  currentJobPost: string;
  recruiterOutreachCount?: number;
  /** @deprecated Read for migration; new writes go to channelFreezes. */
  hiringFeesFrozen?: boolean;
  /** @deprecated Read for migration; new writes go to channelFreezes. */
  hiringFeesFrozenAt?: Date;
  channelFreezes?: ChannelFreezeMap;
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return undefined;
}

function deserializeChannelFreezes(raw: unknown): ChannelFreezeMap | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const map: ChannelFreezeMap = {};
  for (const key of FREEZABLE_CHANNEL_KEYS) {
    const entry = (raw as Record<string, unknown>)[key];
    if (entry && typeof entry === 'object') {
      const e = entry as Record<string, unknown>;
      // Only attach frozenAt when present — Firestore rejects explicit undefined
      // on subsequent writes (the next toggle spreads this state back into setDoc).
      const frozenAt = toDate(e.frozenAt);
      map[key] = frozenAt ? { frozen: Boolean(e.frozen), frozenAt } : { frozen: Boolean(e.frozen) };
    }
  }
  return Object.keys(map).length > 0 ? map : undefined;
}

export async function getHiringConfig(): Promise<HiringConfig> {
  const ref = doc(db, HIRING_CONFIG_DOC);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { currentJobPost: '' };

  const data = snap.data();
  const legacyFrozenAt = toDate(data.hiringFeesFrozenAt);
  const legacyFrozen = data.hiringFeesFrozen === true;

  let channelFreezes = deserializeChannelFreezes(data.channelFreezes);

  // Migrate legacy global freeze → per-channel freezes when channelFreezes is absent.
  if (!channelFreezes && legacyFrozen && legacyFrozenAt) {
    channelFreezes = {};
    for (const key of FREEZABLE_CHANNEL_KEYS) {
      channelFreezes[key] = { frozen: true, frozenAt: legacyFrozenAt };
    }
  }

  return {
    currentJobPost: data.currentJobPost ?? '',
    recruiterOutreachCount: data.recruiterOutreachCount,
    hiringFeesFrozen: legacyFrozen,
    hiringFeesFrozenAt: legacyFrozenAt,
    channelFreezes,
  };
}

export async function updateHiringConfig(config: Partial<HiringConfig>): Promise<void> {
  const ref = doc(db, HIRING_CONFIG_DOC);
  await setDoc(ref, config, { merge: true });
}

export async function updateChannelFreezes(channelFreezes: ChannelFreezeMap): Promise<void> {
  // Strip explicit-undefined fields. Firestore rejects them, and they can sneak in via
  // legacy docs or upstream spreads of prior state.
  const sanitized: ChannelFreezeMap = {};
  for (const key of FREEZABLE_CHANNEL_KEYS) {
    const entry = channelFreezes[key];
    if (!entry) continue;
    sanitized[key] = entry.frozen && entry.frozenAt
      ? { frozen: true, frozenAt: entry.frozenAt }
      : { frozen: Boolean(entry.frozen) };
  }
  await updateHiringConfig({ channelFreezes: sanitized });
}

export function buildAllFrozenMap(now: Date, existing?: ChannelFreezeMap): ChannelFreezeMap {
  const next: ChannelFreezeMap = {};
  for (const key of FREEZABLE_CHANNEL_KEYS) {
    const prev = existing?.[key];
    next[key] = {
      frozen: true,
      // Preserve earlier frozenAt so freezing again doesn't silently extend accrual.
      frozenAt: prev?.frozen && prev.frozenAt ? prev.frozenAt : now,
    };
  }
  return next;
}

export function buildAllResumedMap(): ChannelFreezeMap {
  const next: ChannelFreezeMap = {};
  for (const key of FREEZABLE_CHANNEL_KEYS) {
    next[key] = { frozen: false };
  }
  return next;
}

export function isAllFrozen(channelFreezes?: ChannelFreezeMap): boolean {
  if (!channelFreezes) return false;
  return FREEZABLE_CHANNEL_KEYS.every((k) => channelFreezes[k]?.frozen === true);
}
