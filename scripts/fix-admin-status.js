const mongoose = require('mongoose');

async function fixAdminStatus() {
  const uri = process.env.MONGO_URI;
  
  if (!uri) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.db.collection('admin_users').updateMany(
      { status: 'PENDING_MFA' },
      { $set: { status: 'ACTIVE' } }
    );

    console.log('Updated', result.modifiedCount, 'admins from PENDING_MFA to ACTIVE');
    
    // Also list all admins
    const admins = await mongoose.connection.db.collection('admin_users').find({}).toArray();
    console.log('\nAll admins:');
    admins.forEach(a => {
      console.log(`- ${a.email}: status=${a.status}, role=${a.role}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAdminStatus();
