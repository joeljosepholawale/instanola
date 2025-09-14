// Test script to create sample transactions for testing pagination
// This is for development/testing only - remove before production

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
// This is just a template - you'd need proper credentials
console.log('This is a template script for creating test transactions.');
console.log('To use this:');
console.log('1. Add your Firebase service account key');
console.log('2. Initialize Firebase Admin');
console.log('3. Replace USER_ID with actual user ID');
console.log('4. Run with proper Firebase credentials');

// Template code (commented out for safety):
/*
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project.firebaseio.com"
});

const db = admin.firestore();

async function createTestTransactions() {
  const userId = 'YOUR_USER_ID_HERE'; // Replace with actual user ID
  
  const sampleTransactions = [
    {
      userId: userId,
      type: 'deposit',
      amount: 100,
      currency: 'USD',
      description: 'PaymentPoint bank transfer - ₦160,000',
      status: 'completed',
      provider: 'paymentpoint',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      userId: userId,
      type: 'purchase',
      amount: -5.50,
      currency: 'USD',
      description: 'Number rental: +1234567890 for WhatsApp',
      status: 'completed',
      provider: 'daisysms',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      userId: userId,
      type: 'refund',
      amount: 3.25,
      currency: 'USD',
      description: 'Refund for cancelled number: +1987654321',
      status: 'completed',
      provider: 'daisysms',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ];
  
  // Create transactions
  for (let i = 0; i < sampleTransactions.length; i++) {
    const transaction = sampleTransactions[i];
    await db.collection('transactions').add(transaction);
    console.log(`Created transaction ${i + 1}`);
  }
  
  console.log('Test transactions created successfully!');
}

// createTestTransactions().catch(console.error);
*/

console.log('Test transaction template ready. Configure with your Firebase credentials to use.');
