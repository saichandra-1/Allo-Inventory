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

    // Release reservation and update stock atomically
    const updatedReservation = await prisma.$transaction(async (tx) => {
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
      return tx.reservation.update({
        where: { id },
        data: { status: 'RELEASED' },
        include: {
          product: true,
          warehouse: true,
        },
      });
    });

    return NextResponse.json(updatedReservation);
  } catch (error) {
    console.error('Error releasing reservation:', error);
    return NextResponse.json(
      { error: 'Failed to release reservation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
