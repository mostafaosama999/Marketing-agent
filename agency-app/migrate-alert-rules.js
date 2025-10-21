// Database migration script: Convert task-based to ticket-based
// Run with: node migrate-alert-rules.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, where, query } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCStARaH8ZCFLKHUzRsO0j1JZoUz_dYLnw",
  authDomain: "ai-adv-5e502.firebaseapp.com",
  projectId: "ai-adv-5e502",
  storageBucket: "ai-adv-5e502.firebasestorage.app",
  messagingSenderId: "265851924797",
  appId: "1:265851924797:web:ade8ac1d9e3a0b5baa52e6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateAlertRules() {
  console.log('🔄 Starting migration: task-based → ticket-based');
  console.log('');

  try {
    // Find all alert rules with type 'task-based'
    const q = query(collection(db, 'alertRules'), where('type', '==', 'task-based'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('✅ No task-based rules found. Migration already complete or no rules to migrate.');
      return;
    }

    console.log(`📋 Found ${snapshot.docs.length} task-based rule(s) to migrate:`);

    // Process each rule
    for (let i = 0; i < snapshot.docs.length; i++) {
      const ruleDoc = snapshot.docs[i];
      const ruleData = ruleDoc.data();

      console.log(`\n${i + 1}. "${ruleData.name}"`);
      console.log(`   Current type: ${ruleData.type}`);
      console.log(`   Conditions:`, JSON.stringify(ruleData.conditions, null, 6));

      // Update the rule type
      await updateDoc(doc(db, 'alertRules', ruleDoc.id), {
        type: 'ticket-based',
        updatedAt: new Date().toISOString()
      });

      console.log(`   ✅ Updated to: ticket-based`);
    }

    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`📊 Updated ${snapshot.docs.length} alert rule(s)`);

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const verifyQuery = query(collection(db, 'alertRules'), where('type', '==', 'task-based'));
    const verifySnapshot = await getDocs(verifyQuery);

    if (verifySnapshot.empty) {
      console.log('✅ Verification passed: No task-based rules remaining');
    } else {
      console.log(`❌ Verification failed: ${verifySnapshot.docs.length} task-based rules still exist`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateAlertRules()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });