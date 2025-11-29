// src/types/crossEntityFilter.ts
// Types for cross-entity filtering (filtering leads by company values and vice versa)

import { Company } from './crm';
import { Lead } from './lead';
import { LeadAggregationType } from './filter';

/**
 * Context passed to filter functions for cross-entity data access
 */
export interface CrossEntityFilterContext {
  // For leads filtering: map of companyId -> Company for O(1) lookups
  companiesMap?: Map<string, Company>;
  // For company filtering: map of companyId -> Lead[] for O(1) lookups
  leadsMap?: Map<string, Lead[]>;
}

/**
 * Helper type for aggregation option display in UI
 */
export interface AggregationOption {
  value: LeadAggregationType;
  label: string;
  description: string;
}

/**
 * Aggregation options for company→leads filtering
 */
export const AGGREGATION_OPTIONS: AggregationOption[] = [
  {
    value: 'any',
    label: 'Any lead has',
    description: 'At least one lead matches the condition',
  },
  {
    value: 'all',
    label: 'All leads have',
    description: 'Every lead must match the condition',
  },
  {
    value: 'none',
    label: 'No leads have',
    description: 'No leads should match the condition',
  },
  {
    value: 'count',
    label: 'Lead count is',
    description: 'Number of matching leads meets criteria',
  },
];

/**
 * Count operator options for lead count aggregation
 */
export const COUNT_OPERATOR_OPTIONS = [
  { value: 'equals', label: 'equals' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
  { value: 'between', label: 'between' },
] as const;
