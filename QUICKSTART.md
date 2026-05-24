# Quick Start Guide

## Local Development (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Copy `.env.example` to `.env` and fill in:
```env
DATABASE_URL="your-neon-db-url"
REDIS_URL="your-upstash-redis-url"
CRON_SECRET="any-random-string"
```

### 3. Setup Database
```bash
npx prisma generate
npx prisma migrate dev
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000

## Testing the Flow

1. Go to http://localhost:3000
2. Click "View Products"
3. Select a product and warehouse
4. Enter quantity and click "Reserve"
5. You'll see a countdown timer (10 minutes)
6. Click "Confirm Purchase" or "Cancel"

## Testing Race Conditions

Open 2 browser tabs:
1. Both tabs: Go to same product
2. Both tabs: Try to reserve the LAST unit simultaneously
3. Result: One succeeds, other gets "Insufficient stock" error

## Testing Expiry

1. Create a reservation
2. Wait 10 minutes (or manually update `expiresAt` in database to past time)
3. Try to confirm → Gets "Reservation has expired" error
4. Manually trigger cron: 
   ```bash
   curl -H "Authorization: Bearer your-cron-secret" \
     http://localhost:3000/api/cron/expire-reservations
   ```
5. Check products page → Stock is released

## Common Issues

**"Failed to connect to database"**
- Check DATABASE_URL is correct
- Ensure Neon database is running

**"Redis connection failed"**
- Check REDIS_URL is correct
- Ensure Upstash Redis is active

**"Prisma Client not generated"**
- Run `npx prisma generate`

**Build fails**
- Delete `.next` folder
- Run `npm run build` again
