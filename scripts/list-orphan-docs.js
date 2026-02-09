/**
 * List orphaned documents (documents with missing files)
 * Run with: node scripts/list-orphan-docs.js
 */
const mongoose = require('mongoose');
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/veridex_documents';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);
  
  const docs = await mongoose.connection.db.collection('documents').find({}).toArray();
  console.log('Total documents in DB:', docs.length);
  console.log('');
  
  for (const doc of docs) {
    console.log(`ID: ${doc._id}`);
    console.log(`  Name: ${doc.fileName}`);
    console.log(`  Path: ${doc.filePath}`);
    console.log(`  Exists: ${fs.existsSync(doc.filePath) ? 'YES' : 'NO - ORPHANED'}`);
    console.log('');
  }
  
  await mongoose.disconnect();
}

main().catch(console.error);
