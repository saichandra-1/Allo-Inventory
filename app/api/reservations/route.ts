import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import redis from '@/lib/redis';
import { z } from 'zod';
import { addMinutes } from 'date-fns';

const reservationSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  units: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, warehouseId, units } = reservationSchema.parse(body);

    const lockKey = `lock:stock:${productId}:${warehouseId}`;
    const lockValue = `${Date.now()}`;
    const lockTTL = 5; // 5 seconds

    // Acquire distributed lock
    const lockAcquired = await redis.set(lockKey, lockValue, 'EX', lockTTL, 'NX');

    if (!lockAcquired) {
      return NextResponse.json(
        { error: 'Another operation is in progress. Please try again.' },
        { status: 409 }
      );
    }

    try {
      // Check stock availability
      const stock = await prisma.stock.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
      });

      if (!stock) {
        return NextResponse.json(
          { error: 'Stock not found for this product and warehouse' },
          { status: 404 }
        );
      }

      const availableUnits = stock.totalUnits - stock.reservedUnits;

      if (availableUnits < units) {
        return NextResponse.json(
          { error: 'Insufficient stock available', available: availableUnits },
          { status: 409 }
        );
      }

      // Create reservation and update stock atomically
      const expiresAt = addMinutes(new Date(), 10);

      const reservation = await prisma.$transaction(async (tx: any) => {
        // Increment reserved units
        await tx.stock.update({
          where: {
            productId_warehouseId: {
              productId,
              warehouseId,
            },
          },
          data: {
            reservedUnits: {
              increment: units,
            },
          },
        });

        // Create reservation
        return tx.reservation.create({
          data: {
            productId,
            warehouseId,
            units,
            status: 'PENDING',
            expiresAt,
          },
          include: {
            product: true,
            warehouse: true,
          },
        });
      });

      return NextResponse.json(reservation, { status: 201 });
    } finally {
      // Release lock
      const currentLock = await redis.get(lockKey);
      if (currentLock === lockValue) {
        await redis.del(lockKey);
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    );
  }
}
