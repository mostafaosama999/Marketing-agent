import { SourcedCandidate } from '../types/sourcedCandidate';
import { LinkedInDmTemplate } from '../types/linkedinDmTemplate';
import { replaceOutboundTemplateVariables } from '../services/api/templateVariablesService';

export interface CopyDmOptions {
  /**
   * Template to use when candidate.draftOutreach is empty. Optional; if absent
   * and draftOutreach is also empty, resolveDmText returns an empty string.
   */
  template?: LinkedInDmTemplate | null;
  /**
   * If true (default), always prefer the candidate's draftOutreach when non-empty.
   * Set false to force rendering from template even if draftOutreach exists
   * (used by the "Reset to template" action in the dialog).
   */
  preferDraft?: boolean;
}

/**
 * Build the DM text for a candidate without writing to clipboard. Pure.
 * Returns an empty string if neither a draft nor a template is available.
 */
export function resolveDmText(
  candidate: Pick<SourcedCandidate, 'draftOutreach' | 'name' | 'currentRole' | 'currentCompany' | 'university' | 'tier' | 'recommendedOfferEgp' | 'techStack' | 'writingSignals' | 'linkedInUrl'>,
  options: CopyDmOptions = {}
): string {
  const { template, preferDraft = true } = options;
  const hasDraft = !!candidate.draftOutreach && candidate.draftOutreach.trim().length > 0;
  if (preferDraft && hasDraft) return candidate.draftOutreach;
  if (template) return replaceOutboundTemplateVariables(template.body, candidate as Partial<SourcedCandidate>);
  if (hasDraft) return candidate.draftOutreach;
  return '';
}

/**
 * Copy the resolved DM text to the system clipboard. Returns the string that
 * was copied so the caller can persist it to `messageSent` on confirmation.
 * Throws if the clipboard API is unavailable or the resolved text is empty.
 */
export async function copyDmToClipboard(
  candidate: Parameters<typeof resolveDmText>[0],
  options: CopyDmOptions = {}
): Promise<string> {
  const text = resolveDmText(candidate, options);
  if (!text) {
    throw new Error('No draft or template available for this candidate.');
  }
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    throw new Error('Clipboard is unavailable in this browser.');
  }
  await navigator.clipboard.writeText(text);
  return text;
}
