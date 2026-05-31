const admin = require('firebase-admin');
const sa = require('/Users/mostafa.osama2/.config/gcloud/marketing-sa-key.json');
admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'marketing-app-cc237' });
const db = admin.firestore();
function toDate(v){ if(!v) return null; if(typeof v.toDate==='function') return v.toDate();
  if(typeof v==='string'){const d=new Date(v);return isNaN(d)?null:d;} if(v&&v._seconds)return new Date(v._seconds*1000); return null; }
const VERIFIED_CONTACTED = new Set(['coalesce','coderabbit','datafold','maxim ai']); // found in sent mail
(async () => {
  const esnap = await db.collection('entities').get();
  const may = new Map();
  esnap.forEach(doc=>{ const d=doc.data();
    const dt = toDate(d.createdAt) || (doc.createTime?doc.createTime.toDate():null);
    if(dt && dt.toISOString().slice(0,7)==='2026-05') may.set(doc.id, {name:d.name||d.companyName||'(no name)', rating:d.ratingV2});
  });
  const lsnap = await db.collection('leads').get();
  const contacted = new Set();
  lsnap.forEach(doc=>{ const d=doc.data(); if(!may.has(d.companyId)) return;
    const es=d.outreach?.email?.status, ls=d.outreach?.linkedIn?.status, st=(d.status_v2||d.status||'').toLowerCase();
    const sent=(es&&es!=='not_sent'&&es!=='draft')||(ls&&ls!=='not_sent')||!['new_lead','not_contacted','prospect','qualified',''].includes(st);
    if(sent) contacted.add(d.companyId);
  });
  const uncontacted=[];
  for(const [id,info] of may){
    if(contacted.has(id)) continue;
    if(VERIFIED_CONTACTED.has(info.name.toLowerCase())) continue; // exclude mail-verified
    uncontacted.push(info);
  }
  console.log('Genuinely uncontacted May entities:', uncontacted.length);
  // distribution
  const dist={}; uncontacted.forEach(u=>{const k=(u.rating==null)?'(none)':u.rating; dist[k]=(dist[k]||0)+1;});
  const tierOf=r=>r==null?'(unscored)': r>=8?'Hot (8-10)': r>=6?'Warm (6-7)': r>=4?'Cold (4-5)':'Skip (0-3)';
  const tdist={}; uncontacted.forEach(u=>{const k=tierOf(u.rating); tdist[k]=(tdist[k]||0)+1;});
  console.log('\nratingV2 value distribution:');
  Object.keys(dist).sort((a,b)=>(''+a).localeCompare(''+b)).forEach(k=>console.log('  '+k+': '+dist[k]));
  console.log('\nTier distribution:');
  Object.keys(tdist).sort().forEach(k=>console.log('  '+k+': '+tdist[k]));
  process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
