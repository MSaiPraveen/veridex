/**
 * Script to update existing documents that are missing reviewStatus
 * Run this script to migrate existing documents to have proper review status
 * 
 * Usage: node scripts/update-review-status.js
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI_DOCUMENTS || 'mongodb+srv://veridex:veridex123@veridex-cluster.xxxxx.mongodb.net/veridex-document?retryWrites=true&w=majority';

async function updateReviewStatus() {
  console.log('Connecting to MongoDB...');
  
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('Connected successfully');
    
    const db = client.db(); // Uses database from URI
    const collection = db.collection('documents');
    
    // Find documents without reviewStatus
    const docsWithoutStatus = await collection.find({ 
      reviewStatus: { $exists: false } 
    }).toArray();
    
    console.log(`Found ${docsWithoutStatus.length} documents without reviewStatus`);
    
    if (docsWithoutStatus.length === 0) {
      console.log('All documents already have reviewStatus. Nothing to update.');
      return;
    }
    
    // Update documents based on their current state
    for (const doc of docsWithoutStatus) {
      let reviewStatus = 'PENDING_REVIEW';
      let complianceStatus = 'PENDING';
      
      // If document has extraction data and is in good status, set to PENDING_REVIEW
      if (doc.extractionStatus === 'SUCCESS') {
        reviewStatus = 'PENDING_REVIEW';
        // Check if compliance was already evaluated
        if (doc.complianceResult?.status === 'COMPLIANT') {
          complianceStatus = 'COMPLIANT';
        } else if (doc.complianceResult?.status === 'NON_COMPLIANT') {
          complianceStatus = 'NON_COMPLIANT';
        }
      } else if (doc.extractionStatus === 'IN_PROGRESS') {
        reviewStatus = 'PENDING_REVIEW';
      }
      
      await collection.updateOne(
        { _id: doc._id },
        { 
          $set: { 
            reviewStatus,
            complianceStatus,
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`Updated document ${doc._id}: reviewStatus=${reviewStatus}, complianceStatus=${complianceStatus}`);
    }
    
    console.log(`\nSuccessfully updated ${docsWithoutStatus.length} documents`);
    
    // Show summary
    const summary = await collection.aggregate([
      { $group: { _id: '$reviewStatus', count: { $sum: 1 } } }
    ]).toArray();
    
    console.log('\nDocument status summary:');
    summary.forEach(s => console.log(`  ${s._id}: ${s.count}`));
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

updateReviewStatus();
