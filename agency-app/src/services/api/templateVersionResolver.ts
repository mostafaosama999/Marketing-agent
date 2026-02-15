// src/services/api/templateVersionResolver.ts
// Resolves which offer template version to use based on company labels

import { OfferTemplateVersion } from '../../types/settings';

export interface ResolvedTemplate {
  version: OfferTemplateVersion;
  matchType: 'exact' | 'default';
}

export interface VersionConflict {
  matchingVersions: OfferTemplateVersion[];
  companyLabels: string[];
}

export type VersionResolution =
  | { resolved: ResolvedTemplate }
  | { conflict: VersionConflict };

/**
 * Resolves the correct template version for a company's labels.
 *
 * - No labels / no match → V1 (default)
 * - Exactly one version matches → use it
 * - Multiple versions match → return conflict for UI to handle
 */
export function resolveTemplateVersion(
  versions: OfferTemplateVersion[],
  companyLabels: string[] | undefined
): VersionResolution {
  const defaultVersion = versions.find(v => v.isDefault) || versions[0];

  if (!defaultVersion) {
    // Should never happen, but safety fallback
    return {
      resolved: {
        version: {
          id: 'v1',
          name: 'Default',
          offerTemplate: '',
          offerHeadline: '',
          labels: [],
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        matchType: 'default',
      },
    };
  }

  // No labels on company → use default
  if (!companyLabels || companyLabels.length === 0) {
    return { resolved: { version: defaultVersion, matchType: 'default' } };
  }

  // Find versions whose labels overlap with company labels
  // Skip default if it has no explicit labels (it's the catch-all)
  const matchingVersions = versions.filter(v => {
    if (v.labels.length === 0) return false;
    return v.labels.some(label => companyLabels.includes(label));
  });

  if (matchingVersions.length === 0) {
    return { resolved: { version: defaultVersion, matchType: 'default' } };
  }

  if (matchingVersions.length === 1) {
    return { resolved: { version: matchingVersions[0], matchType: 'exact' } };
  }

  // Multiple matches → conflict
  return {
    conflict: {
      matchingVersions,
      companyLabels,
    },
  };
}
