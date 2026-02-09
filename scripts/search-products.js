const mongoose = require('mongoose');

async function searchProducts() {
  const uri = process.env.MONGO_URI;
  
  if (!uri) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Search for sp calcium / abo corp
    const products = await mongoose.connection.db.collection('products').find({
      $or: [
        { name: /calcium/i },
        { name: /sp/i },
        { brand: /abo/i },
        { merchantName: /abo/i },
        { organizationName: /abo/i }
      ]
    }).toArray();

    console.log('Found', products.length, 'products matching calcium/sp/abo:');
    products.forEach(p => {
      console.log(JSON.stringify({
        name: p.name,
        brand: p.brand,
        merchantName: p.merchantName,
        organizationName: p.organizationName,
        scope: p.scope,
        isActive: p.isActive
      }, null, 2));
    });

    // Also list all product names
    console.log('\n--- ALL PRODUCTS ---');
    const allProducts = await mongoose.connection.db.collection('products').find({}).toArray();
    allProducts.forEach(p => console.log(`- ${p.name}`));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

searchProducts();
