/**
 * Script to link existing organization to a specific user
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function linkOrgToUser() {
  console.log('🔧 Linking organization to user...\n');
  
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const userOrgDb = client.db('veridex-user-org');
    const authDb = client.db('veridex-auth');
    
    const orgs = userOrgDb.collection('organizations');
    const authUsers = authDb.collection('users');
    const memberships = userOrgDb.collection('memberships');
    
    // Find the organization (case insensitive search for "abo")
    const org = await orgs.findOne({ name: { $regex: /abo/i } });
    
    if (!org) {
      console.log('❌ Organization not found. Creating one...');
      
      // Create org for user
      const newOrg = {
        _id: new ObjectId(),
        name: 'Abo Corp',
        type: 'MERCHANT',
        status: 'ACTIVE',
        settings: {
          notifications: { email: true, sms: false, push: true },
          privacy: { showPublicProfile: false },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await orgs.insertOne(newOrg);
      console.log(`✅ Created organization: Abo Corp (${newOrg._id})`);
      
      // Find user and update
      const user = await authUsers.findOne({ email: 'abo@gmail.com' });
      if (user) {
        await authUsers.updateOne(
          { _id: user._id },
          { $set: { organizationId: String(newOrg._id) } }
        );
        console.log(`✅ Linked organization to user: abo@gmail.com`);
        
        // Create membership
        await memberships.insertOne({
          _id: new ObjectId(),
          userId: String(user._id),
          organizationId: newOrg._id,
          role: 'OWNER',
          status: 'ACTIVE',
          acceptedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ Created OWNER membership`);
      }
    } else {
      console.log(`📋 Found organization: ${org.name} (${org._id})`);
      
      // Find user
      const user = await authUsers.findOne({ email: 'abo@gmail.com' });
      
      if (!user) {
        console.log('❌ User abo@gmail.com not found');
        return;
      }
      
      console.log(`📋 Found user: ${user.email} (${user._id})`);
      console.log(`   Current organizationId: ${user.organizationId || 'NONE'}`);
      
      // Update user with organizationId
      await authUsers.updateOne(
        { _id: user._id },
        { $set: { organizationId: String(org._id) } }
      );
      console.log(`✅ Updated user organizationId to: ${org._id}`);
      
      // Check/create membership
      const existingMembership = await memberships.findOne({
        userId: String(user._id),
        organizationId: org._id,
      });
      
      if (!existingMembership) {
        await memberships.insertOne({
          _id: new ObjectId(),
          userId: String(user._id),
          organizationId: org._id,
          role: 'OWNER',
          status: 'ACTIVE',
          acceptedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ Created OWNER membership`);
      } else {
        console.log(`ℹ️  Membership already exists`);
      }
    }
    
    console.log('\n✨ Done!');
    console.log('\n⚠️  IMPORTANT: Log out and log back in to get a new JWT token with the organizationId.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n📤 Disconnected from MongoDB');
  }
}

// Run
linkOrgToUser().catch(console.error);
