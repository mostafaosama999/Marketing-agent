import { Applicant } from '../types/applicant';

const EGP_TO_USD = 50.5;

export type CostCategory = 'platforms' | 'hr' | 'writing-tests';
export type CostChannelStatus = 'closed' | 'recurring' | 'per-event';

export const FREEZABLE_CHANNEL_KEYS = ['wuzzuf', 'linkedin-v2', 'upwork-recruiter'] as const;
export type FreezableChannelKey = typeof FREEZABLE_CHANNEL_KEYS[number];

export interface ChannelFreezeState {
  frozen: boolean;
  frozenAt?: Date;
}

export type ChannelFreezeMap = Partial<Record<FreezableChannelKey, ChannelFreezeState>>;

export interface CostChannel {
  key: string;
  name: string;
  category: CostCategory;
  amountUSD: number;
  detail: string;
  unitRate: string;
  status: CostChannelStatus;
  elapsed?: string;
  eventCount?: number;
  freezable?: boolean;
  frozen?: boolean;
  frozenAt?: Date;
}

export interface HiringCostBreakdown {
  totalUSD: number;
  channels: CostChannel[];
  paidTestCount: number;
}

const formatUSD = (amount: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.ceil(amount));

function weeksSince(start: Date, now: Date): number {
  const ms = now.getTime() - start.getTime();
  if (ms < 0) return 0;
  return Math.max(1, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)));
}

function monthsSince(start: Date, now: Date): number {
  if (now < start) return 0;
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.max(1, now.getDate() >= start.getDate() ? months + 1 : months);
}

function daysSince(start: Date, now: Date): number {
  const ms = now.getTime() - start.getTime();
  if (ms < 0) return 0;
  return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function countPaidTests(applicants: Applicant[]): number {
  return applicants.filter((a) => a.paymentConfirmed === true).length;
}

export function calculateHiringCosts(applicants: Applicant[], freezes?: ChannelFreezeMap): HiringCostBreakdown {
  const now = new Date();
  const referenceFor = (key: FreezableChannelKey): Date => {
    const state = freezes?.[key];
    return state?.frozen && state.frozenAt ? state.frozenAt : now;
  };
  const isFrozen = (key: FreezableChannelKey): boolean => freezes?.[key]?.frozen === true;
  const frozenAtFor = (key: FreezableChannelKey): Date | undefined => freezes?.[key]?.frozenAt;

  const channels: CostChannel[] = [];

  // Recruiting Platforms
  // LinkedIn Job Post V1 — one-off, 7100 EGP
  const linkedinV1USD = 7100 / EGP_TO_USD;
  channels.push({
    key: 'linkedin-v1',
    name: 'LinkedIn Job Post V1',
    category: 'platforms',
    amountUSD: linkedinV1USD,
    detail: `One-off (closed)`,
    unitRate: formatUSD(linkedinV1USD),
    status: 'closed',
  });

  // Wuzzuf — $270/month, started March 28, 2026
  const wuzzufStart = new Date('2026-03-28');
  const wuzzufNow = referenceFor('wuzzuf');
  const wuzzufMonths = monthsSince(wuzzufStart, wuzzufNow);
  const wuzzufUSD = wuzzufMonths * 270;
  channels.push({
    key: 'wuzzuf',
    name: 'Wuzzuf',
    category: 'platforms',
    amountUSD: wuzzufUSD,
    detail: `${wuzzufMonths} month${wuzzufMonths !== 1 ? 's' : ''} × $270/mo`,
    unitRate: '$270/mo',
    status: 'recurring',
    elapsed: `${wuzzufMonths} mo`,
    freezable: true,
    frozen: isFrozen('wuzzuf'),
    frozenAt: frozenAtFor('wuzzuf'),
  });

  // LinkedIn Job Post V2 — 1,000 EGP/day, started April 1, 2026
  const linkedinV2Start = new Date('2026-04-01');
  const linkedinV2Now = referenceFor('linkedin-v2');
  const linkedinV2Days = daysSince(linkedinV2Start, linkedinV2Now);
  const linkedinV2USD = (linkedinV2Days * 1000) / EGP_TO_USD;
  channels.push({
    key: 'linkedin-v2',
    name: 'LinkedIn Job Post V2',
    category: 'platforms',
    amountUSD: linkedinV2USD,
    detail: `${linkedinV2Days} days × ${formatUSD(1000 / EGP_TO_USD)}/day`,
    unitRate: `${formatUSD(1000 / EGP_TO_USD)}/day`,
    status: 'recurring',
    elapsed: `${linkedinV2Days}d`,
    freezable: true,
    frozen: isFrozen('linkedin-v2'),
    frozenAt: frozenAtFor('linkedin-v2'),
  });

  // Human Resources
  // Upwork Recruiter — $100/week, started March 22, 2026
  const upworkStart = new Date('2026-03-22');
  const upworkNow = referenceFor('upwork-recruiter');
  const upworkWeeks = weeksSince(upworkStart, upworkNow);
  const upworkUSD = upworkWeeks * 100;
  channels.push({
    key: 'upwork-recruiter',
    name: 'Upwork Recruiter',
    category: 'hr',
    amountUSD: upworkUSD,
    detail: `${upworkWeeks} weeks × $100/wk`,
    unitRate: '$100/wk',
    status: 'recurring',
    elapsed: `${upworkWeeks} wks`,
    freezable: true,
    frozen: isFrozen('upwork-recruiter'),
    frozenAt: frozenAtFor('upwork-recruiter'),
  });

  // Writing Tests
  // Paid Writing Tests — 1,000 EGP per test
  const paidTestCount = countPaidTests(applicants);
  const paidTestsUSD = (paidTestCount * 1000) / EGP_TO_USD;
  channels.push({
    key: 'paid-tests',
    name: 'Paid Writing Tests',
    category: 'writing-tests',
    amountUSD: paidTestsUSD,
    detail: `${paidTestCount} test${paidTestCount !== 1 ? 's' : ''} × ${formatUSD(1000 / EGP_TO_USD)}/test`,
    unitRate: `${formatUSD(1000 / EGP_TO_USD)}/test`,
    status: 'per-event',
    eventCount: paidTestCount,
  });

  const totalUSD = channels.reduce((s, c) => s + c.amountUSD, 0);

  return { totalUSD, channels, paidTestCount };
}

export { formatUSD };
