const mongoose = require('mongoose');

async function fixProducts() {
  const uri = process.env.MONGO_URI;
  
  if (!uri) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Update all products to have scope=GLOBAL and isActive=true
    const result = await mongoose.connection.db.collection('products').updateMany(
      {}, // All products
      { 
        $set: { 
          scope: 'GLOBAL',
          isActive: true,
          status: 'ACTIVE'
        } 
      }
    );

    console.log('Updated', result.modifiedCount, 'products with scope=GLOBAL, isActive=true');
    
    // List products to verify
    const products = await mongoose.connection.db.collection('products').find({}).limit(5).toArray();
    console.log('\nSample products after fix:');
    products.forEach(p => {
      console.log(`- ${p.name}: scope=${p.scope}, isActive=${p.isActive}, status=${p.status}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixProducts();
