import { Lead } from '../app/types/crm';

/**
 * Deduplication configuration
 */
export interface DeduplicationConfig {
  keys: ('name' | 'email' | 'company')[];
  caseSensitive: boolean;
}

const DEFAULT_CONFIG: DeduplicationConfig = {
  keys: ['name'],
  caseSensitive: false,
};

/**
 * Generate a unique key for a lead based on deduplication config
 */
export function generateLeadKey(lead: Lead | { name: string; email?: string; company?: string }, config: DeduplicationConfig = DEFAULT_CONFIG): string {
  const parts: string[] = [];

  config.keys.forEach((key) => {
    const value = lead[key];
    if (value) {
      parts.push(config.caseSensitive ? value : value.toLowerCase());
    }
  });

  return parts.join('|');
}

/**
 * Check if a lead is a duplicate of another lead
 */
export function isDuplicate(
  lead1: Lead | { name: string; email?: string; company?: string },
  lead2: Lead | { name: string; email?: string; company?: string },
  config: DeduplicationConfig = DEFAULT_CONFIG
): boolean {
  return generateLeadKey(lead1, config) === generateLeadKey(lead2, config);
}

/**
 * Find duplicate leads in a list
 */
export function findDuplicates(
  newLead: { name: string; email?: string; company?: string },
  existingLeads: Lead[],
  config: DeduplicationConfig = DEFAULT_CONFIG
): Lead[] {
  const newLeadKey = generateLeadKey(newLead, config);
  return existingLeads.filter(lead => generateLeadKey(lead, config) === newLeadKey);
}

/**
 * Deduplicate a list of leads, keeping only the first occurrence of each unique lead
 */
export function deduplicateLeads(
  leads: Lead[],
  config: DeduplicationConfig = DEFAULT_CONFIG
): Lead[] {
  const seen = new Set<string>();
  const deduplicated: Lead[] = [];

  leads.forEach((lead) => {
    const key = generateLeadKey(lead, config);
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(lead);
    }
  });

  return deduplicated;
}

/**
 * Get deduplication config from localStorage or use default
 */
export function getDeduplicationConfig(): DeduplicationConfig {
  try {
    const stored = localStorage.getItem('crm_deduplication_config');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading deduplication config:', error);
  }
  return DEFAULT_CONFIG;
}

/**
 * Save deduplication config to localStorage
 */
export function saveDeduplicationConfig(config: DeduplicationConfig): void {
  try {
    localStorage.setItem('crm_deduplication_config', JSON.stringify(config));
  } catch (error) {
    console.error('Error saving deduplication config:', error);
  }
}
