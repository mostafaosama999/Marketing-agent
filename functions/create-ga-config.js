const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'marketing-app-cc237'
});

const db = admin.firestore();

async function setup() {
  try {
    await db.collection('googleAnalytics').doc('3nJ7C0mLdITkPBpdtnxKrNWMruJ2').set({
      propertyId: '512779722',
      websiteUrl: 'https://yourwebsite.com',
      enabled: true,
      syncInterval: 'daily',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: '3nJ7C0mLdITkPBpdtnxKrNWMruJ2'
    }, { merge: true });
    
    console.log('\n✅ SUCCESS! Google Analytics configuration created!\n');
    console.log('📋 Configuration:');
    console.log('   • User ID: 3nJ7C0mLdITkPBpdtnxKrNWMruJ2');
    console.log('   • Property ID: 512779722');
    console.log('   • Website: https://yourwebsite.com');
    console.log('   • Enabled: true');
    console.log('   • Sync Interval: daily (2 AM UTC)');
    console.log('\n📍 Firestore Location:');
    console.log('   googleAnalytics/3nJ7C0mLdITkPBpdtnxKrNWMruJ2');
    console.log('\n🎯 Next Steps:');
    console.log('   1. (Optional) Update website URL in Firestore console');
    console.log('   2. Open your CRM app');
    console.log('   3. Go to Analytics → Outbound Analytics');
    console.log('   4. Scroll to "Website Analytics" section');
    console.log('   5. Click "Sync Now" button');
    console.log('   6. Watch your GA4 data appear! 🎉\n');
    console.log('🔗 Links:');
    console.log('   • Firestore: https://console.firebase.google.com/project/marketing-app-cc237/firestore');
    console.log('   • Your App: http://localhost:3000/analytics/outbound\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

setup();
