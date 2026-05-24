import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Find all expired pending reservations
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: now,
        },
      },
    });

    if (expiredReservations.length === 0) {
      return NextResponse.json({
        message: 'No expired reservations found',
        released: 0,
      });
    }

    // Release each expired reservation
    const results = await Promise.all(
      expiredReservations.map(async (reservation) => {
        try {
          await prisma.$transaction(async (tx) => {
            // Decrement reserved units
            await tx.stock.update({
              where: {
                productId_warehouseId: {
                  productId: reservation.productId,
                  warehouseId: reservation.warehouseId,
                },
              },
              data: {
                reservedUnits: {
                  decrement: reservation.units,
                },
              },
            });

            // Update reservation status
            await tx.reservation.update({
              where: { id: reservation.id },
              data: { status: 'RELEASED' },
            });
          });

          return { id: reservation.id, success: true };
        } catch (error) {
          console.error(`Failed to release reservation ${reservation.id}:`, error);
          return { id: reservation.id, success: false };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      message: 'Expired reservations processed',
      total: expiredReservations.length,
      released: successCount,
      failed: expiredReservations.length - successCount,
    });
  } catch (error) {
    console.error('Error in expiry cron job:', error);
    return NextResponse.json(
      { error: 'Failed to process expired reservations' },
      { status: 500 }
    );
  }
}
