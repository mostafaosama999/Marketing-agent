import * as admin from "firebase-admin";
import {LeadDoc, CompanyDoc, OutreachStatus} from "../types";

/**
 * Lead/company specific helpers exposed to the model. Mutating writes are
 * scoped to outreach state and timeline append; the model can never delete
 * or arbitrarily mutate leads.
 */

export async function readLead(args: {leadId: string}): Promise<{
  lead?: LeadDoc;
  error?: string;
}> {
  try {
    const ref = admin.firestore().collection("leads").doc(args.leadId);
    const snap = await ref.get();
    if (!snap.exists) return {error: `Lead ${args.leadId} not found`};
    return {lead: {id: snap.id, ...(snap.data() as Omit<LeadDoc, "id">)}};
  } catch (e) {
    return {error: e instanceof Error ? e.message : String(e)};
  }
}

export async function readCompany(args: {companyId: string}): Promise<{
  company?: CompanyDoc;
  error?: string;
}> {
  try {
    // The lead.companyId FK points at `entities` — there is no `companies`
    // collection in this project. The argument name stays `companyId` for
    // CRM-side semantic consistency, but the read goes to entities.
    const ref = admin.firestore().collection("entities").doc(args.companyId);
    const snap = await ref.get();
    if (!snap.exists) return {error: `Entity ${args.companyId} not found`};
    return {company: {id: snap.id, ...(snap.data() as Omit<CompanyDoc, "id">)}};
  } catch (e) {
    return {error: e instanceof Error ? e.message : String(e)};
  }
}

/**
 * Maps an OutreachStatus to the timestamp field that should be stamped on the
 * transition. W2 added the non-sent transitions so the analyst skill can
 * answer time-bounded questions like "reply rate this month".
 *
 * not_sent has no associated timestamp (it's the initial state).
 */
const TIMESTAMP_FIELD_FOR_STATUS: Record<OutreachStatus, string | null> = {
  not_sent: null,
  sent: "sentAt",
  opened: "openedAt",
  replied: "repliedAt",
  refused: "refusedAt",
  no_response: "noResponseAt",
};

export async function updateLeadOutreach(args: {
  leadId: string;
  channel: "linkedIn" | "email";
  status: OutreachStatus;
  note?: string;
}): Promise<{ok: boolean; error?: string}> {
  try {
    const ref = admin.firestore().collection("leads").doc(args.leadId);
    const tsField = TIMESTAMP_FIELD_FOR_STATUS[args.status];
    await ref.set(
      {
        outreach: {
          [args.channel]: {
            status: args.status,
            ...(tsField
              ? {[tsField]: admin.firestore.FieldValue.serverTimestamp()}
              : {}),
          },
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
    if (args.note) {
      await ref
        .collection("timeline")
        .add({
          type: "outreach_update",
          channel: args.channel,
          status: args.status,
          note: args.note,
          at: admin.firestore.FieldValue.serverTimestamp(),
          by: "nikola",
        });
    }
    return {ok: true};
  } catch (e) {
    return {ok: false, error: e instanceof Error ? e.message : String(e)};
  }
}

export async function appendTimeline(args: {
  leadId: string;
  type: string;
  payload: Record<string, unknown>;
}): Promise<{ok: boolean; error?: string}> {
  try {
    await admin
      .firestore()
      .collection("leads")
      .doc(args.leadId)
      .collection("timeline")
      .add({
        type: args.type,
        ...args.payload,
        at: admin.firestore.FieldValue.serverTimestamp(),
        by: "nikola",
      });
    return {ok: true};
  } catch (e) {
    return {ok: false, error: e instanceof Error ? e.message : String(e)};
  }
}
