import * as admin from "firebase-admin";
import {LeadDoc} from "../types";

/**
 * Decide whether an incoming email is a reply to a Nikola-drafted prospect message.
 *
 * Match rules (any one is enough):
 *   1. From address matches lead.email or lead.outreach.email.recipientEmail
 *   2. Subject is a `Re: ...` of a previous Nikola draft subject saved on
 *      lead.outreach.email.originalSubject
 *
 * Returns the matching lead, or null if no match.
 */
export async function matchReplyToLead(input: {
  fromEmail?: string;
  subject?: string;
}): Promise<LeadDoc | null> {
  if (!input.fromEmail && !input.subject) return null;

  // From-address match
  if (input.fromEmail) {
    const norm = input.fromEmail.toLowerCase().trim();
    const byPrimary = await admin
      .firestore()
      .collection("leads")
      .where("email", "==", norm)
      .limit(1)
      .get();
    if (!byPrimary.empty) {
      return {id: byPrimary.docs[0].id, ...(byPrimary.docs[0].data() as Omit<LeadDoc, "id">)};
    }
    const byOutreach = await admin
      .firestore()
      .collection("leads")
      .where("outreach.email.recipientEmail", "==", norm)
      .limit(1)
      .get();
    if (!byOutreach.empty) {
      return {id: byOutreach.docs[0].id, ...(byOutreach.docs[0].data() as Omit<LeadDoc, "id">)};
    }
  }

  // Subject match (case-insensitive Re: prefix)
  if (input.subject) {
    const cleaned = input.subject.replace(/^(re:|fwd:)\s*/i, "").trim().toLowerCase();
    if (cleaned.length > 5) {
      const bySubject = await admin
        .firestore()
        .collection("leads")
        .where("outreach.email.originalSubject", "==", cleaned)
        .limit(1)
        .get();
      if (!bySubject.empty) {
        return {id: bySubject.docs[0].id, ...(bySubject.docs[0].data() as Omit<LeadDoc, "id">)};
      }
    }
  }

  return null;
}
