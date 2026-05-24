'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

type Warehouse = {
  warehouseId: string;
  warehouseName: string;
  location: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  warehouses: Warehouse[];
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reserving, setReserving] = useState<string | null>(null);
  const [units, setUnits] = useState<{ [key: string]: number }>({});
  const router = useRouter();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async (productId: string, warehouseId: string) => {
    const key = `${productId}-${warehouseId}`;
    const unitsToReserve = units[key] || 1;

    if (unitsToReserve < 1) {
      alert('Please enter a valid quantity');
      return;
    }

    setReserving(key);
    setError('');

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          warehouseId,
          units: unitsToReserve,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError(data.error + (data.available ? ` (Available: ${data.available})` : ''));
        } else {
          setError(data.error || 'Failed to create reservation');
        }
        return;
      }

      // Redirect to reservation page
      router.push(`/reservation/${data.id}`);
    } catch (err) {
      setError('Failed to create reservation');
    } finally {
      setReserving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <p className="text-lg">Loading products...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Products</h1>
          <p className="text-gray-600">Browse available products and make reservations</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid gap-6">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{product.name}</CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                  </div>
                  <Badge variant="outline">{product.sku}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {product.warehouses.map((warehouse) => {
                    const key = `${product.id}-${warehouse.warehouseId}`;
                    return (
                      <div
                        key={warehouse.warehouseId}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{warehouse.warehouseName}</p>
                          <p className="text-sm text-gray-600">{warehouse.location}</p>
                          <div className="mt-2 flex gap-4 text-sm">
                            <span>Total: {warehouse.totalUnits}</span>
                            <span>Reserved: {warehouse.reservedUnits}</span>
                            <span className="font-semibold text-green-600">
                              Available: {warehouse.availableUnits}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max={warehouse.availableUnits}
                            value={units[key] || 1}
                            onChange={(e) =>
                              setUnits({ ...units, [key]: parseInt(e.target.value) || 1 })
                            }
                            className="w-20"
                            disabled={warehouse.availableUnits === 0}
                          />
                          <Button
                            onClick={() => handleReserve(product.id, warehouse.warehouseId)}
                            disabled={warehouse.availableUnits === 0 || reserving === key}
                          >
                            {reserving === key ? 'Reserving...' : 'Reserve'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
