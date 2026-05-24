# Allo Health - Inventory Reservation System

A Next.js application that handles inventory reservations with race-condition-free stock management, automatic expiry, and real-time updates.

## 🎯 Problem Statement

E-commerce platforms face a critical race condition: during checkout, payment can take several minutes (3DS flows, UPI confirmations), and thousands of shoppers may view the same product simultaneously. This system solves overselling by implementing temporary reservations with automatic expiry.

## 🚀 Live Demo

**Deployed URL:** https://allo-inventory-lime.vercel.app/

## ✨ Features

- **Race-Condition-Free Reservations** - Distributed locking with Redis prevents overselling
- **Automatic Expiry** - Reservations expire after 10 minutes if not confirmed
- **Real-Time Countdown** - Live timer shows remaining reservation time
- **Multi-Warehouse Support** - Track inventory across multiple locations
- **Error Handling** - User-friendly 409 (insufficient stock) and 410 (expired) errors
- **Atomic Transactions** - Stock updates are always consistent

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma 5
- **Cache/Locking:** Redis (Upstash)
- **Validation:** Zod
- **UI:** Tailwind CSS + shadcn/ui
- **Deployment:** Vercel

## 📦 Installation & Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Neon PostgreSQL account
- Upstash Redis account

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd allo-inventory
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
# Database (Neon DB)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Redis (Upstash)
REDIS_URL="rediss://default:password@host:port"

# Cron Job Security
CRON_SECRET="your-random-secret-key"
```

**Get your credentials:**
- **Neon DB:** https://neon.tech → Create project → Copy connection string
- **Upstash Redis:** https://upstash.com → Create database → Copy Redis URL
- **CRON_SECRET:** Generate a random string (e.g., `openssl rand -base64 32`)

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database with sample data
npm run seed
```

This creates:
- 3 warehouses (Mumbai, Delhi, Bangalore)
- 4 products (Vitamin D3, Omega-3, Multivitamin Gummies, Probiotics)
- 12 stock entries (each product in each warehouse)

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📚 API Documentation

### GET /api/products

List all products with available stock per warehouse.

**Response:**
```json
[
  {
    "id": "cm5x...",
    "name": "Vitamin D3 Tablets",
    "sku": "VIT-D3-1000",
    "warehouses": [
      {
        "warehouseId": "cm5x...",
        "warehouseName": "Mumbai Warehouse",
        "totalUnits": 150,
        "reservedUnits": 5,
        "availableUnits": 145
      }
    ]
  }
]
```

### GET /api/warehouses

List all warehouses.

### POST /api/reservations

Create a new reservation (race-condition-free).

**Request:**
```json
{
  "productId": "cm5x...",
  "warehouseId": "cm5x...",
  "units": 5
}
```

**Success (201):**
```json
{
  "id": "cm5x...",
  "status": "PENDING",
  "expiresAt": "2026-05-24T23:50:00.000Z",
  ...
}
```

**Error (409 - Insufficient Stock):**
```json
{
  "error": "Insufficient stock available",
  "available": 3
}
```

### POST /api/reservations/:id/confirm

Confirm a reservation (payment succeeded).

**Success (200):** Returns updated reservation with status "CONFIRMED"

**Error (410 - Expired):**
```json
{
  "error": "Reservation has expired"
}
```

### POST /api/reservations/:id/release

Release a reservation early (payment failed/cancelled).

**Success (200):** Returns updated reservation with status "RELEASED"

## 🔄 How Reservation Expiry Works

### Production (Lazy Cleanup)

Due to Vercel Hobby plan limitations (cron jobs limited to once per day), the system uses **lazy cleanup** instead:

**How it works:**
1. When users visit the products page (`GET /api/products`)
2. The endpoint automatically checks for expired PENDING reservations
3. Releases them immediately (decrements `reservedUnits`, sets status to "RELEASED")
4. Returns updated stock availability

**Benefits:**
- ✅ No cron job needed (works on free tier)
- ✅ Stock is released as soon as someone views products after expiry
- ✅ Frontend countdown still prevents confirmation after expiry (410 error)
- ✅ No stale reservations blocking inventory

**Trade-off:**
- Expired reservations stay locked until someone visits the products page
- In practice, this is fine for a demo/low-traffic site

### Alternative: Manual Cron Trigger

The cron endpoint still exists and can be triggered manually or via external services (e.g., cron-job.org):

```bash
curl -H "Authorization: Bearer your-cron-secret" \
  https://your-app.vercel.app/api/cron/expire-reservations
```

### Local Development

Same lazy cleanup works locally. Or manually trigger:
```bash
curl -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/cron/expire-reservations
```

## 🏗️ Architecture & Design Decisions

### Concurrency Handling (Critical)

**Problem:** Two users clicking "Reserve" simultaneously for the last unit.

**Solution:** Distributed locking with Redis

```typescript
// Acquire lock (5-second TTL)
const lockKey = `lock:stock:${productId}:${warehouseId}`;
const locked = await redis.set(lockKey, value, 'EX', 5, 'NX');

if (!locked) {
  return 409; // Another operation in progress
}

try {
  // Check stock and create reservation atomically
  await prisma.$transaction([...]);
} finally {
  // Release lock
  await redis.del(lockKey);
}
```

**Why this works:**
- `NX` flag ensures only ONE request acquires the lock
- Lock expires after 5 seconds (prevents deadlocks)
- Prisma transactions ensure atomic stock updates

### Database Schema

```
Product (id, name, sku, description)
  ↓
Stock (productId, warehouseId, totalUnits, reservedUnits)
  ↓
Reservation (id, productId, warehouseId, units, status, expiresAt)
```

**Key insight:** `availableUnits = totalUnits - reservedUnits` (calculated, not stored)

### Why Prisma v5 instead of v7?

Prisma v7 requires adapters for all database connections, adding complexity. v5 is stable and works seamlessly with Neon's connection pooling.

## 🚢 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `CRON_SECRET`
4. Deploy!

Vercel automatically:
- Runs `prisma generate` during build
- Sets up the cron job from `vercel.json`
- Enables serverless functions

### Post-Deployment

1. Run migrations on production database:
```bash
npx prisma migrate deploy
```

2. Seed production database:
```bash
npm run seed
```

3. Test the cron job is running (check Vercel logs)

## 🧪 Testing

### Test Race Conditions

Open 2 browser tabs and click "Reserve" simultaneously on the last unit:
- ✅ One succeeds
- ❌ Other gets 409 error

### Test Expiry

1. Create a reservation
2. Wait 10 minutes (or manually update `expiresAt` in database)
3. Try to confirm → Gets 410 error
4. Check stock → Reserved units released back

### Test Flow

```bash
# 1. View products
GET /api/products

# 2. Reserve units
POST /api/reservations
{
  "productId": "...",
  "warehouseId": "...",
  "units": 5
}

# 3. Confirm purchase
POST /api/reservations/{id}/confirm
```

## 🎯 Trade-offs & Future Improvements

### Current Trade-offs

1. **Expiry mechanism:** Uses lazy cleanup (on-read) instead of background cron
   - Vercel Hobby plan only allows daily cron jobs
   - Expired reservations released when products page is viewed
   - Works well for demo/low-traffic scenarios
2. **Lock timeout:** 5 seconds (balance between safety and user experience)
3. **No idempotency:** Duplicate requests create duplicate reservations (bonus feature not implemented)

### With More Time

1. **Idempotency:** Cache API responses in Redis with `Idempotency-Key` header
2. **Webhooks:** Notify users when reservations expire
3. **Analytics:** Track conversion rates, abandoned reservations
4. **Inventory alerts:** Notify when stock is low
5. **Multi-region:** Deploy Redis and DB closer to users
6. **Optimistic locking:** Use database-level locks instead of Redis for simpler setup
7. **Queue system:** Use BullMQ for more robust background job processing

## 📝 Project Structure

```
allo-inventory/
├── app/
│   ├── api/
│   │   ├── products/route.ts          # GET products
│   │   ├── warehouses/route.ts        # GET warehouses
│   │   ├── reservations/
│   │   │   ├── route.ts               # POST create reservation
│   │   │   └── [id]/
│   │   │       ├── route.ts           # GET reservation
│   │   │       ├── confirm/route.ts   # POST confirm
│   │   │       └── release/route.ts   # POST release
│   │   └── cron/
│   │       └── expire-reservations/route.ts  # Cron job
│   ├── products/page.tsx              # Product listing
│   ├── reservation/[id]/page.tsx      # Checkout page
│   └── page.tsx                       # Home
├── components/ui/                     # shadcn components
├── lib/
│   ├── prisma.ts                      # Prisma client
│   └── redis.ts                       # Redis client
├── prisma/
│   ├── schema.prisma                  # Database schema
│   ├── migrations/                    # Migration history
│   └── seed.ts                        # Seed script
└── vercel.json                        # Cron configuration
```



---

**Built with ❤️ for Allo Health**

**By Chandra**
