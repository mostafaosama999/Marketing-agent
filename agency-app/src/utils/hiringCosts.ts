import { Applicant } from '../types/applicant';

const EGP_TO_USD = 50.5;

export type CostCategory = 'platforms' | 'hr' | 'writing-tests';

export interface CostChannel {
  name: string;
  category: CostCategory;
  amountUSD: number;
  detail: string;
  unitRate: string;
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
  return applicants.filter(
    (a) => a.outreach?.email?.templateName?.toLowerCase().includes('paid')
  ).length;
}

export function calculateHiringCosts(applicants: Applicant[]): HiringCostBreakdown {
  const now = new Date();
  const channels: CostChannel[] = [];

  // Recruiting Platforms
  // LinkedIn Job Post V1 — one-off, 7100 EGP
  const linkedinV1USD = 7100 / EGP_TO_USD;
  channels.push({
    name: 'LinkedIn Job Post V1',
    category: 'platforms',
    amountUSD: linkedinV1USD,
    detail: `One-off (closed)`,
    unitRate: formatUSD(linkedinV1USD),
  });

  // Wuzzuf — $270/month, started March 28, 2026
  const wuzzufStart = new Date('2026-03-28');
  const wuzzufMonths = monthsSince(wuzzufStart, now);
  const wuzzufUSD = wuzzufMonths * 270;
  channels.push({
    name: 'Wuzzuf',
    category: 'platforms',
    amountUSD: wuzzufUSD,
    detail: `${wuzzufMonths} month${wuzzufMonths !== 1 ? 's' : ''} × $270/mo`,
    unitRate: '$270/mo',
  });

  // LinkedIn Job Post V2 — 1,000 EGP/day, started April 1, 2026
  const linkedinV2Start = new Date('2026-04-01');
  const linkedinV2Days = daysSince(linkedinV2Start, now);
  const linkedinV2USD = (linkedinV2Days * 1000) / EGP_TO_USD;
  channels.push({
    name: 'LinkedIn Job Post V2',
    category: 'platforms',
    amountUSD: linkedinV2USD,
    detail: `${linkedinV2Days} days × ${formatUSD(1000 / EGP_TO_USD)}/day`,
    unitRate: `${formatUSD(1000 / EGP_TO_USD)}/day`,
  });

  // Human Resources
  // Upwork Recruiter — $100/week, started March 22, 2026
  const upworkStart = new Date('2026-03-22');
  const upworkWeeks = weeksSince(upworkStart, now);
  const upworkUSD = upworkWeeks * 100;
  channels.push({
    name: 'Upwork Recruiter',
    category: 'hr',
    amountUSD: upworkUSD,
    detail: `${upworkWeeks} weeks × $100/wk`,
    unitRate: '$100/wk',
  });

  // Writing Tests
  // Paid Writing Tests — 1,000 EGP per test
  const paidTestCount = countPaidTests(applicants);
  const paidTestsUSD = (paidTestCount * 1000) / EGP_TO_USD;
  channels.push({
    name: 'Paid Writing Tests',
    category: 'writing-tests',
    amountUSD: paidTestsUSD,
    detail: `${paidTestCount} test${paidTestCount !== 1 ? 's' : ''} × ${formatUSD(1000 / EGP_TO_USD)}/test`,
    unitRate: `${formatUSD(1000 / EGP_TO_USD)}/test`,
  });

  const totalUSD = channels.reduce((s, c) => s + c.amountUSD, 0);

  return { totalUSD, channels, paidTestCount };
}

export { formatUSD };
