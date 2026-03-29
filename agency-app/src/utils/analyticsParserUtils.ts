import * as XLSX from 'xlsx';
import {
  ParsedLinkedInData,
  ParsedTDSData,
  ParsedMediumData,
  LinkedInDailyEngagement,
  LinkedInTopPost,
  LinkedInDemographicEntry,
  TDSArticle,
  MediumStory,
  MediumMonthlySummary,
} from '../types/contentAnalytics';

// ===== HELPER FUNCTIONS =====

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function parseMoneyString(str: string): number {
  if (!str || str === '—' || str === '-') return 0;
  const cleaned = str.replace(/[$,]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

export function parseNumberString(str: string): number {
  if (!str || str === '—' || str === '-') return 0;
  const trimmed = str.trim();

  const kMatch = trimmed.match(/^([\d.]+)K$/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  const mMatch = trimmed.match(/^([\d.]+)M$/i);
  if (mMatch) {
    return Math.round(parseFloat(mMatch[1]) * 1000000);
  }

  const cleaned = trimmed.replace(/,/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

export function parseDateString(str: string): string {
  if (!str) return '';
  const trimmed = str.trim();

  // "3/30/2025" or "03/30/2025"
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // "March 20, 2026" or "Mar 16, 2026"
  const monthNames: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04',
    jun: '06', jul: '07', aug: '08',
    sep: '09', oct: '10', nov: '11', dec: '12',
  };

  const longMatch = trimmed.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (longMatch) {
    const [, monthStr, d, y] = longMatch;
    const m = monthNames[monthStr.toLowerCase()];
    if (m) {
      return `${y}-${m}-${d.padStart(2, '0')}`;
    }
  }

  // "YYYY-MM-DD" passthrough
  const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) return trimmed;

  return trimmed;
}

// ===== LINKEDIN PARSER =====

export function parseLinkedInExcel(workbook: XLSX.WorkBook): ParsedLinkedInData {
  const discovery = parseDiscoverySheet(workbook);
  const engagement = parseEngagementSheet(workbook);
  const topPosts = parseTopPostsSheet(workbook);
  const followers = parseFollowersSheet(workbook);
  const demographics = parseDemographicsSheet(workbook);

  return { discovery, engagement, topPosts, followers, demographics };
}

function getSheet(workbook: XLSX.WorkBook, name: string): XLSX.WorkSheet {
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Sheet "${name}" not found in workbook`);
  return sheet;
}

function sheetToRows(sheet: XLSX.WorkSheet): string[][] {
  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
}

function parseDiscoverySheet(workbook: XLSX.WorkBook) {
  const rows = sheetToRows(getSheet(workbook, 'DISCOVERY'));
  const periodRaw = String(rows[0]?.[1] || '');
  const periodParts = periodRaw.split(' - ');
  const periodStart = parseDateString(periodParts[0] || '');
  const periodEnd = parseDateString(periodParts[1] || '');
  const overallImpressions = parseNumberString(String(rows[1]?.[1] || '0'));
  const membersReached = parseNumberString(String(rows[2]?.[1] || '0'));

  return { overallImpressions, membersReached, periodStart, periodEnd };
}

function parseEngagementSheet(workbook: XLSX.WorkBook): LinkedInDailyEngagement[] {
  const rows = sheetToRows(getSheet(workbook, 'ENGAGEMENT'));
  const results: LinkedInDailyEngagement[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    const date = parseDateString(String(row[0]));
    const impressions = parseNumberString(String(row[1] || '0'));
    const engagements = parseNumberString(String(row[2] || '0'));
    const engagementRate = impressions > 0 ? engagements / impressions : 0;
    results.push({ date, impressions, engagements, engagementRate });
  }

  return results;
}

function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `li-${Math.abs(hash).toString(36)}`;
}

function parseTopPostsSheet(workbook: XLSX.WorkBook): LinkedInTopPost[] {
  const rows = sheetToRows(getSheet(workbook, 'TOP POSTS'));
  const postMap = new Map<string, Partial<LinkedInTopPost>>();

  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    // Left table: Post URL (0), Post Publish Date (1), Engagements (2)
    const leftUrl = String(row[0] || '').trim();
    if (leftUrl) {
      const existing = postMap.get(leftUrl) || { url: leftUrl };
      existing.publishDate = parseDateString(String(row[1] || ''));
      existing.engagements = parseNumberString(String(row[2] || '0'));
      postMap.set(leftUrl, existing);
    }

    // Right table: Post URL (4), Post Publish Date (5), Impressions (6)
    const rightUrl = String(row[4] || '').trim();
    if (rightUrl) {
      const existing = postMap.get(rightUrl) || { url: rightUrl };
      existing.publishDate = existing.publishDate || parseDateString(String(row[5] || ''));
      existing.impressions = parseNumberString(String(row[6] || '0'));
      postMap.set(rightUrl, existing);
    }
  }

  return Array.from(postMap.values()).map((post) => {
    const engagements = post.engagements || 0;
    const impressions = post.impressions || 0;
    return {
      id: hashUrl(post.url!),
      url: post.url!,
      publishDate: post.publishDate || '',
      engagements,
      impressions,
      engagementRate: impressions > 0 ? engagements / impressions : 0,
    };
  });
}

function parseFollowersSheet(workbook: XLSX.WorkBook) {
  const rows = sheetToRows(getSheet(workbook, 'FOLLOWERS'));
  const headerRow = String(rows[0]?.[0] || '');
  const totalFollowers = parseNumberString(String(rows[0]?.[1] || '0'));

  let asOfDate = '';
  const dateMatch = headerRow.match(/on\s+(.+)$/i);
  if (dateMatch) {
    asOfDate = parseDateString(dateMatch[1]);
  }

  const dailyNewFollowers: Array<{ date: string; newFollowers: number }> = [];
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    dailyNewFollowers.push({
      date: parseDateString(String(row[0])),
      newFollowers: parseNumberString(String(row[1] || '0')),
    });
  }

  return { totalFollowers, asOfDate, dailyNewFollowers };
}

function parseDemographicsSheet(workbook: XLSX.WorkBook) {
  const rows = sheetToRows(getSheet(workbook, 'DEMOGRAPHICS'));

  const categoryMap: Record<string, string> = {
    'company': 'company',
    'location': 'location',
    'company size': 'companySize',
    'seniority': 'seniority',
    'job title': 'jobTitle',
  };

  const result: Record<string, LinkedInDemographicEntry[]> = {
    company: [],
    location: [],
    companySize: [],
    seniority: [],
    jobTitle: [],
  };

  let currentKey = '';

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const col0 = String(row[0] || '').trim();
    const col1 = String(row[1] || '').trim();
    const col2 = String(row[2] || '').trim();

    const mappedKey = categoryMap[col0.toLowerCase()];
    if (mappedKey) {
      currentKey = mappedKey;
      if (col1 && col2) {
        result[currentKey].push({ name: col1, percentage: col2 });
      }
      continue;
    }

    if (currentKey && col0) {
      result[currentKey].push({ name: col0, percentage: col1 });
    }
  }

  return result as ParsedLinkedInData['demographics'];
}

// ===== TDS PARSER =====

const TDS_SKIP_PATTERNS = [
  /^title$/i,
  /^pageviews$/i,
  /^engaged\s*views$/i,
  /^sort\s+(ascending|descending)$/i,
  /^\d+\s+items?$/i,
  /^of\s+\d+$/i,
  /^next\s+page$/i,
  /^previous\s+page$/i,
  /^page\s+\d+$/i,
  /^estimated\s+payout$/i,
  /^paid$/i,
  /^published\s+date$/i,
  /^30\s*d(ay)?/i,
  /^lifetime$/i,
];

function isTDSNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return TDS_SKIP_PATTERNS.some((p) => p.test(trimmed));
}

export function parseTDSText(text: string): ParsedTDSData {
  const lines = text.split('\n').filter((line) => !isTDSNoiseLine(line));
  const articles: TDSArticle[] = [];

  for (const line of lines) {
    const parts = line.split(/\t+/).map((s) => s.trim());
    if (parts.length < 8) {
      // Try splitting on multiple spaces
      const altParts = line.split(/\s{2,}/).map((s) => s.trim());
      if (altParts.length >= 8) {
        parts.length = 0;
        parts.push(...altParts);
      } else {
        continue;
      }
    }

    const [title, pvLifeStr, evLifeStr, pv30dStr, ev30dStr, payoutStr, paidStr, dateStr] = parts;

    if (!title || !dateStr) continue;

    const publishedDate = parseDateString(dateStr);
    if (!publishedDate || publishedDate < '2026-01-01') continue;

    const pageviewsLifetime = parseNumberString(pvLifeStr);
    const engagedViewsLifetime = parseNumberString(evLifeStr);
    const pageviews30d = (pv30dStr === '—' || pv30dStr === '-' || !pv30dStr) ? null : parseNumberString(pv30dStr);
    const engagedViews30d = (ev30dStr === '—' || ev30dStr === '-' || !ev30dStr) ? null : parseNumberString(ev30dStr);
    const estimatedPayout = parseMoneyString(payoutStr);
    const paid = paidStr?.toLowerCase() === 'yes';

    articles.push({
      id: slugify(title),
      title,
      pageviewsLifetime,
      engagedViewsLifetime,
      pageviews30d,
      engagedViews30d,
      estimatedPayout,
      paid,
      publishedDate,
    });
  }

  const totalPageviews = articles.reduce((sum, a) => sum + a.pageviewsLifetime, 0);
  const totalEngagedViews = articles.reduce((sum, a) => sum + a.engagedViewsLifetime, 0);
  const totalPageviews30d = articles.reduce((sum, a) => sum + (a.pageviews30d || 0), 0);
  const totalEngagedViews30d = articles.reduce((sum, a) => sum + (a.engagedViews30d || 0), 0);
  const totalEarnings = articles.reduce((sum, a) => sum + a.estimatedPayout, 0);
  const avgEngagementRate = totalPageviews > 0 ? totalEngagedViews / totalPageviews : 0;

  return {
    articles,
    summary: {
      totalArticles: articles.length,
      totalPageviews,
      totalEngagedViews,
      totalPageviews30d,
      totalEngagedViews30d,
      totalEarnings,
      avgEngagementRate,
    },
  };
}

// ===== MEDIUM PARSER =====

function parseMediumMonthlyBlock(lines: string[]): { summary: MediumMonthlySummary; endIndex: number } {
  let month = '';
  let presentations = 0;
  let views = 0;
  let reads = 0;
  let followersGained = 0;
  let subscribersGained = 0;

  let i = 0;

  // Find the month line (e.g., "March 2026")
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (/^[A-Z][a-z]+\s+\d{4}$/.test(trimmed)) {
      month = trimmed;
      i++;
      break;
    }
    i++;
  }

  // Parse label-value pairs. Values come on lines before their labels.
  const values: string[] = [];
  const labels = ['Presentations', 'Views', 'Reads', 'Followers', 'Subscribers'];

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) { i++; continue; }

    const isLabel = labels.some((l) => trimmed.toLowerCase().includes(l.toLowerCase()));
    if (isLabel) {
      const val = values.length > 0 ? values[values.length - 1] : '0';
      const lowerTrimmed = trimmed.toLowerCase();
      if (lowerTrimmed.includes('presentation')) presentations = parseNumberString(val);
      else if (lowerTrimmed.includes('view')) views = parseNumberString(val);
      else if (lowerTrimmed.includes('read')) reads = parseNumberString(val);
      else if (lowerTrimmed.includes('follower')) followersGained = parseNumberString(val.replace(/^\+/, ''));
      else if (lowerTrimmed.includes('subscriber')) subscribersGained = parseNumberString(val.replace(/^\+/, ''));
      i++;

      if (lowerTrimmed.includes('subscriber')) break;
      continue;
    }

    values.push(trimmed);
    i++;
  }

  return {
    summary: { month, presentations, views, reads, followersGained, subscribersGained },
    endIndex: i,
  };
}

export function parseMediumText(text: string): ParsedMediumData {
  const allLines = text.split('\n');

  const { summary: currentMonth, endIndex } = parseMediumMonthlyBlock(allLines);

  const storyLines = allLines.slice(endIndex);
  const stories: MediumStory[] = [];

  let i = 0;
  while (i < storyLines.length) {
    const line = storyLines[i]?.trim();
    if (!line) { i++; continue; }

    // A story block starts with a title, followed by lines with "·" separators
    // then numeric lines for presentations, views, reads, earnings
    if (
      i + 1 < storyLines.length &&
      storyLines.slice(i + 1, i + 5).some((l) => l.trim() === '·')
    ) {
      const title = line;
      let j = i + 1;

      // Collect metadata parts (between · separators)
      let readTime = '';
      let publishDateStr = '';

      while (j < storyLines.length) {
        const part = storyLines[j]?.trim();
        if (part === '·') { j++; continue; }
        if (/^\d+\s+min\s+read$/i.test(part)) { readTime = part; j++; continue; }
        if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}$/i.test(part)) {
          publishDateStr = part; j++; continue;
        }
        if (/^view\s+story$/i.test(part)) { j++; break; }
        j++;
        // If we hit a numeric value, we've passed metadata
        if (/^[\d.,K$+-]+$/.test(part)) break;
      }

      // Collect numeric values: presentations, views, reads, earnings
      const numericValues: string[] = [];
      while (j < storyLines.length && numericValues.length < 4) {
        const val = storyLines[j]?.trim();
        if (!val) { j++; continue; }
        if (/^[\d.,K$+-]+$/.test(val) || val === '-') {
          numericValues.push(val);
          j++;
        } else {
          break;
        }
      }

      const publishDate = parseDateString(publishDateStr);
      if (publishDate && publishDate >= '2026-01-01') {
        const presentationsVal = numericValues[0] === '-' ? null : parseNumberString(numericValues[0] || '0');
        const viewsVal = parseNumberString(numericValues[1] || '0');
        const readsVal = parseNumberString(numericValues[2] || '0');
        const earningsVal = parseMoneyString(numericValues[3] || '0');
        const readRate = viewsVal > 0 ? readsVal / viewsVal : 0;

        stories.push({
          id: slugify(title),
          title,
          readTime,
          publishDate,
          presentations: presentationsVal,
          views: viewsVal,
          reads: readsVal,
          earnings: earningsVal,
          readRate,
        });
      }

      i = j;
    } else {
      i++;
    }
  }

  const totalViews = stories.reduce((sum, s) => sum + s.views, 0);
  const totalReads = stories.reduce((sum, s) => sum + s.reads, 0);
  const totalEarnings = stories.reduce((sum, s) => sum + s.earnings, 0);
  const avgReadRate = totalViews > 0 ? totalReads / totalViews : 0;

  return {
    stories,
    summary: {
      currentMonth,
      totalStories: stories.length,
      totalViews,
      totalReads,
      totalEarnings,
      avgReadRate,
    },
  };
}
