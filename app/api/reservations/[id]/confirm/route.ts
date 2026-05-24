import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    if (reservation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Reservation is not pending' },
        { status: 400 }
      );
    }

    if (new Date() > reservation.expiresAt) {
      return NextResponse.json(
        { error: 'Reservation has expired' },
        { status: 410 }
      );
    }

    // Confirm reservation and update stock atomically
    const updatedReservation = await prisma.$transaction(async (tx) => {
      // Decrement total units and reserved units
      await tx.stock.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: {
          totalUnits: {
            decrement: reservation.units,
          },
          reservedUnits: {
            decrement: reservation.units,
          },
        },
      });

      // Update reservation status
      return tx.reservation.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: {
          product: true,
          warehouse: true,
        },
      });
    });

    return NextResponse.json(updatedReservation);
  } catch (error) {
    console.error('Error confirming reservation:', error);
    return NextResponse.json(
      { error: 'Failed to confirm reservation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
