import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || '', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: true,
});

export default redis;
