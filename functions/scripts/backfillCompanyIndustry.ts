// One-shot backfill: copy the entities-side industry signal onto every linked
// lead as lead.companyIndustry. Unblocks the analyst skill's
// "industries by reply rate" style queries with a single-collection query.
//
// Source field: entities/{id}.customFields.company_type (e.g. "Data science",
// "SaaS"). There is NO top-level `industry` field on entities in this project.
// Lead linkage:
//   1. lead.companyId (preferred — FK into entities/{id})
//   2. else lead.company name match against entities.name
//
// Safe to re-run — only writes when the lead's current value differs.
//
// Run: cd functions && npx tsx scripts/backfillCompanyIndustry.ts
//
// Project: marketing-app-cc237.

import * as admin from "firebase-admin";

admin.initializeApp({projectId: "marketing-app-cc237"});

const db = admin.firestore();

async function main() {
  const entitiesSnap = await db.collection("entities").get();
  console.log(`Loaded ${entitiesSnap.size} entities.`);

  // Build (id → industry) and (name → industry) maps from customFields.company_type.
  const idToIndustry = new Map<string, string>();
  const nameToIndustry = new Map<string, string>();
  for (const doc of entitiesSnap.docs) {
    const data = doc.data() as {
      name?: string;
      customFields?: {company_type?: string};
    };
    const industry = data.customFields?.company_type;
    if (industry) {
      idToIndustry.set(doc.id, industry);
      if (data.name) nameToIndustry.set(data.name, industry);
    }
  }

  const leadsSnap = await db.collection("leads").get();
  console.log(`Loaded ${leadsSnap.size} leads.`);

  let updated = 0;
  let unchanged = 0;
  let nomatch = 0;
  let batch = db.batch();
  let pending = 0;
  const samples: Array<{leadId: string; via: string; industry: string}> = [];

  for (const doc of leadsSnap.docs) {
    const data = doc.data() as {
      companyId?: string;
      company?: string;
      companyIndustry?: string;
    };

    let resolved: string | undefined;
    let via = "";
    if (data.companyId && idToIndustry.has(data.companyId)) {
      resolved = idToIndustry.get(data.companyId);
      via = "companyId";
    } else if (data.company && nameToIndustry.has(data.company)) {
      resolved = nameToIndustry.get(data.company);
      via = "name";
    }

    if (!resolved) {
      nomatch++;
      continue;
    }
    if (data.companyIndustry === resolved) {
      unchanged++;
      continue;
    }

    batch.set(doc.ref, {companyIndustry: resolved}, {merge: true});
    updated++;
    pending++;
    if (samples.length < 20) {
      samples.push({leadId: doc.id, via, industry: resolved});
    }
    if (pending >= 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending > 0) await batch.commit();

  console.log(`\nUpdated: ${updated}`);
  console.log(`Unchanged (already correct): ${unchanged}`);
  console.log(`No entity match: ${nomatch}`);
  if (samples.length > 0) {
    console.log("\nSample updates (first 20):");
    for (const s of samples) {
      console.log(`  ${s.leadId}  via=${s.via}  industry="${s.industry}"`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
