// src/services/api/crossEntityFilterService.ts
// Service for cross-entity filtering (filtering leads by company values and vice versa)

import { Lead } from '../../types/lead';
import { Company } from '../../types/crm';
import { FilterRule, CountOperator } from '../../types/filter';
import { CrossEntityFilterContext } from '../../types/crossEntityFilter';
import { evaluateRule } from './advancedFilterService';
import { evaluateCompanyRule } from './companyFilterService';

/**
 * Build a map of companyId -> Company for efficient O(1) lookups
 * Used when filtering leads by company values
 */
export function buildCompaniesMap(companies: Company[]): Map<string, Company> {
  return new Map(companies.map(c => [c.id, c]));
}

/**
 * Build a map of companyId -> Lead[] for efficient lookups
 * Groups all leads by their companyId
 * Used when filtering companies by lead values
 */
export function buildLeadsMap(leads: Lead[]): Map<string, Lead[]> {
  const map = new Map<string, Lead[]>();
  for (const lead of leads) {
    if (lead.companyId) {
      const existing = map.get(lead.companyId) || [];
      existing.push(lead);
      map.set(lead.companyId, existing);
    }
  }
  return map;
}

/**
 * Evaluate a company field rule against a lead's linked company
 * Returns true if the lead's company matches the rule
 *
 * @param lead - The lead to evaluate
 * @param rule - The filter rule (with entitySource='company')
 * @param companiesMap - Map of companyId -> Company for O(1) lookups
 */
export function evaluateLeadCrossEntityRule(
  lead: Lead,
  rule: FilterRule,
  companiesMap: Map<string, Company>
): boolean {
  // Only process company-sourced rules
  if (rule.entitySource !== 'company') {
    return true;
  }

  // Lead must have a companyId to evaluate company rules
  if (!lead.companyId) {
    return false; // No company = cannot match company field rules
  }

  const company = companiesMap.get(lead.companyId);

  if (!company) {
    return false; // Company not found in map
  }

  // Re-use existing company rule evaluation
  // The rule.field contains the company field name (e.g., "status", "industry")
  return evaluateCompanyRule(company, rule);
}

/**
 * Evaluate a lead field rule against a company's leads with aggregation
 * Supports: any, all, none, count aggregation types
 *
 * @param company - The company to evaluate
 * @param rule - The filter rule (with entitySource='leads')
 * @param leadsMap - Map of companyId -> Lead[] for O(1) lookups
 */
export function evaluateCompanyCrossEntityRule(
  company: Company,
  rule: FilterRule,
  leadsMap: Map<string, Lead[]>
): boolean {
  // Only process leads-sourced rules
  if (rule.entitySource !== 'leads') {
    return true;
  }

  const companyLeads = leadsMap.get(company.id) || [];
  const aggregationType = rule.aggregationType || 'any';

  // Handle companies with no leads
  if (companyLeads.length === 0) {
    switch (aggregationType) {
      case 'none':
        return true; // "No leads have X" is true if no leads
      case 'any':
        return false; // "Any lead has X" is false if no leads
      case 'all':
        return true; // "All leads have X" is vacuously true
      case 'count':
        return evaluateCountCondition(0, rule.countOperator, rule.countValue);
      default:
        return false;
    }
  }

  // Evaluate each lead against the rule
  const matchingLeads = companyLeads.filter(lead => evaluateRule(lead, rule));

  switch (aggregationType) {
    case 'any':
      return matchingLeads.length > 0;

    case 'all':
      return matchingLeads.length === companyLeads.length;

    case 'none':
      return matchingLeads.length === 0;

    case 'count':
      return evaluateCountCondition(
        matchingLeads.length,
        rule.countOperator,
        rule.countValue
      );

    default:
      return true;
  }
}

/**
 * Evaluate count condition for 'count' aggregation type
 */
function evaluateCountCondition(
  count: number,
  operator?: CountOperator,
  value?: number | [number, number]
): boolean {
  if (!operator || value === undefined) return true;

  switch (operator) {
    case 'equals':
      return count === value;
    case 'greater_than':
      return count > (value as number);
    case 'less_than':
      return count < (value as number);
    case 'between':
      const [min, max] = value as [number, number];
      return count >= min && count <= max;
    default:
      return true;
  }
}

/**
 * Helper to evaluate rules with logic gates using a custom evaluator
 */
export function evaluateRulesWithLogicGates<T>(
  item: T,
  rules: FilterRule[],
  evaluator: (item: T, rule: FilterRule) => boolean
): boolean {
  if (rules.length === 0) return true;

  let result = evaluator(item, rules[0]);

  for (let i = 0; i < rules.length - 1; i++) {
    const currentRule = rules[i];
    const nextRule = rules[i + 1];
    const nextResult = evaluator(item, nextRule);

    if (currentRule.logicGate === 'AND') {
      result = result && nextResult;
    } else if (currentRule.logicGate === 'OR') {
      result = result || nextResult;
    }
  }

  return result;
}
