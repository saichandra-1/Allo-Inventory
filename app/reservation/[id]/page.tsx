'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter, useParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

type Reservation = {
  id: string;
  productId: string;
  warehouseId: string;
  units: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  product: {
    name: string;
    sku: string;
    description: string | null;
  };
  warehouse: {
    name: string;
    location: string;
  };
};

export default function ReservationPage() {
  const params = useParams();
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    fetchReservation();
  }, []);

  useEffect(() => {
    if (!reservation) return;

    const interval = setInterval(() => {
      const now = new Date();
      const expires = new Date(reservation.expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation]);

  const fetchReservation = async () => {
    try {
      const res = await fetch(`/api/reservations/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch reservation');
      const data = await res.json();
      setReservation(data);
    } catch (err) {
      setError('Failed to load reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setProcessing(true);
    setError('');

    try {
      const res = await fetch(`/api/reservations/${params.id}/confirm`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 410) {
          setError('❌ Reservation has expired! The stock has been released.');
        } else {
          setError(data.error || 'Failed to confirm reservation');
        }
        return;
      }

      alert('✅ Purchase confirmed successfully!');
      router.push('/products');
    } catch (err) {
      setError('Failed to confirm reservation');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    setProcessing(true);
    setError('');

    try {
      const res = await fetch(`/api/reservations/${params.id}/release`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to cancel reservation');
        return;
      }

      alert('Reservation cancelled');
      router.push('/products');
    } catch (err) {
      setError('Failed to cancel reservation');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <p className="text-lg">Loading reservation...</p>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <p className="text-lg text-red-600">Reservation not found</p>
      </div>
    );
  }

  const isExpired = timeLeft === 'EXPIRED';
  const isPending = reservation.status === 'PENDING';

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Reservation Details</h1>
          <p className="text-gray-600">Complete your purchase before the timer expires</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{reservation.product.name}</CardTitle>
                <CardDescription>{reservation.product.description}</CardDescription>
              </div>
              <Badge
                variant={
                  reservation.status === 'CONFIRMED'
                    ? 'default'
                    : reservation.status === 'PENDING'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {reservation.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">SKU</p>
                <p className="font-semibold">{reservation.product.sku}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Units Reserved</p>
                <p className="font-semibold">{reservation.units}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Warehouse</p>
                <p className="font-semibold">{reservation.warehouse.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold">{reservation.warehouse.location}</p>
              </div>
            </div>

            {isPending && (
              <div className="border-t pt-6">
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-600 mb-2">Time Remaining</p>
                  <p
                    className={`text-5xl font-bold ${
                      isExpired ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {timeLeft}
                  </p>
                  {!isExpired && (
                    <p className="text-sm text-gray-600 mt-2">
                      Expires {formatDistanceToNow(new Date(reservation.expiresAt), { addSuffix: true })}
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleConfirm}
                    disabled={processing || isExpired}
                    className="flex-1"
                    size="lg"
                  >
                    {processing ? 'Processing...' : 'Confirm Purchase'}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={processing}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {reservation.status === 'CONFIRMED' && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded text-center">
                ✅ Purchase confirmed successfully!
              </div>
            )}

            {reservation.status === 'RELEASED' && (
              <div className="bg-gray-50 border border-gray-200 text-gray-800 px-4 py-3 rounded text-center">
                Reservation has been released
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="link" onClick={() => router.push('/products')}>
            ← Back to Products
          </Button>
        </div>
      </div>
    </main>
  );
}
