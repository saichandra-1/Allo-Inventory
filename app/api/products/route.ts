import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function releaseExpiredReservations() {
  const now = new Date();
  
  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now },
    },
  });

  if (expiredReservations.length > 0) {
    await Promise.all(
      expiredReservations.map(async (reservation: any) => {
        try {
          await prisma.$transaction(async (tx: any) => {
            await tx.stock.update({
              where: {
                productId_warehouseId: {
                  productId: reservation.productId,
                  warehouseId: reservation.warehouseId,
                },
              },
              data: {
                reservedUnits: { decrement: reservation.units },
              },
            });

            await tx.reservation.update({
              where: { id: reservation.id },
              data: { status: 'RELEASED' },
            });
          });
        } catch (error) {
          console.error(`Failed to release reservation ${reservation.id}:`, error);
        }
      })
    );
  }
}

export async function GET() {
  try {
    // Lazy cleanup: release expired reservations on read
    await releaseExpiredReservations();

    const products = await prisma.product.findMany({
      include: {
        stocks: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    const productsWithAvailability = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      warehouses: product.stocks.map((stock: any) => ({
        warehouseId: stock.warehouseId,
        warehouseName: stock.warehouse.name,
        location: stock.warehouse.location,
        totalUnits: stock.totalUnits,
        reservedUnits: stock.reservedUnits,
        availableUnits: stock.totalUnits - stock.reservedUnits,
      })),
    }));

    return NextResponse.json(productsWithAvailability);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
