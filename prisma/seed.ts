import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create warehouses
  const warehouse1 = await prisma.warehouse.create({
    data: {
      name: 'Mumbai Warehouse',
      location: 'Mumbai, Maharashtra',
    },
  });

  const warehouse2 = await prisma.warehouse.create({
    data: {
      name: 'Delhi Warehouse',
      location: 'New Delhi, Delhi',
    },
  });

  const warehouse3 = await prisma.warehouse.create({
    data: {
      name: 'Bangalore Warehouse',
      location: 'Bangalore, Karnataka',
    },
  });

  console.log('✓ Created warehouses');

  // Create products
  const product1 = await prisma.product.create({
    data: {
      name: 'Vitamin D3 Tablets',
      sku: 'VIT-D3-1000',
      description: '1000 IU Vitamin D3 supplement, 60 tablets',
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Omega-3 Fish Oil',
      sku: 'OMEGA-3-500',
      description: '500mg Omega-3 capsules, 90 count',
    },
  });

  const product3 = await prisma.product.create({
    data: {
      name: 'Multivitamin Gummies',
      sku: 'MULTI-GUMMY-60',
      description: 'Daily multivitamin gummies, 60 count',
    },
  });

  const product4 = await prisma.product.create({
    data: {
      name: 'Probiotic Capsules',
      sku: 'PROB-10B-30',
      description: '10 billion CFU probiotic, 30 capsules',
    },
  });

  console.log('✓ Created products');

  // Create stock levels
  await prisma.stock.createMany({
    data: [
      // Vitamin D3
      { productId: product1.id, warehouseId: warehouse1.id, totalUnits: 150, reservedUnits: 0 },
      { productId: product1.id, warehouseId: warehouse2.id, totalUnits: 200, reservedUnits: 0 },
      { productId: product1.id, warehouseId: warehouse3.id, totalUnits: 100, reservedUnits: 0 },
      
      // Omega-3
      { productId: product2.id, warehouseId: warehouse1.id, totalUnits: 80, reservedUnits: 0 },
      { productId: product2.id, warehouseId: warehouse2.id, totalUnits: 120, reservedUnits: 0 },
      { productId: product2.id, warehouseId: warehouse3.id, totalUnits: 50, reservedUnits: 0 },
      
      // Multivitamin Gummies
      { productId: product3.id, warehouseId: warehouse1.id, totalUnits: 300, reservedUnits: 0 },
      { productId: product3.id, warehouseId: warehouse2.id, totalUnits: 250, reservedUnits: 0 },
      { productId: product3.id, warehouseId: warehouse3.id, totalUnits: 180, reservedUnits: 0 },
      
      // Probiotic
      { productId: product4.id, warehouseId: warehouse1.id, totalUnits: 60, reservedUnits: 0 },
      { productId: product4.id, warehouseId: warehouse2.id, totalUnits: 90, reservedUnits: 0 },
      { productId: product4.id, warehouseId: warehouse3.id, totalUnits: 40, reservedUnits: 0 },
    ],
  });

  console.log('✓ Created stock levels');
  console.log('\n✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
