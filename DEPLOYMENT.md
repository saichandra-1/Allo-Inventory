# Deployment Checklist

## Pre-Deployment

- [ ] All code committed to GitHub
- [ ] `.env` file NOT committed (check .gitignore)
- [ ] README.md is complete and accurate
- [ ] Database schema is finalized
- [ ] Seed data is ready

## Vercel Setup

- [ ] Create new project in Vercel
- [ ] Connect GitHub repository
- [ ] Configure environment variables:
  - [ ] `DATABASE_URL` (from Neon)
  - [ ] `REDIS_URL` (from Upstash)
  - [ ] `CRON_SECRET` (generate random string)

## Post-Deployment

- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Seed production database: `npm run seed`
- [ ] Test live URL
- [ ] Verify cron job is running (check Vercel logs)
- [ ] Test full reservation flow:
  - [ ] View products
  - [ ] Create reservation
  - [ ] Countdown timer works
  - [ ] Confirm reservation
  - [ ] Check stock updated
- [ ] Test error scenarios:
  - [ ] 409 - Insufficient stock
  - [ ] 410 - Expired reservation
- [ ] Test race conditions (2 simultaneous requests)
- [ ] Update README with live URL

## Final Checks

- [ ] All API endpoints working
- [ ] Frontend loads correctly
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Git history is clean with meaningful commits
