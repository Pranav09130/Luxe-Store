const Redis = require("ioredis");

let redisClient = null;

function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redisClient.on("error", (err) => {
      console.error("Redis connection error:", err.message);
    });

    redisClient.on("connect", () => {
      console.log("Redis connected");
    });
  }
  return redisClient;
}

async function connectRedis() {
  const client = getRedisClient();
  if (client.status === "wait") {
    await client.connect();
  }
  return client;
}

async function cacheGet(key) {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("Cache get error:", err.message);
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 300) {
  try {
    const client = getRedisClient();
    await client.setex(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error("Cache set error:", err.message);
    return false;
  }
}

async function cacheDel(key) {
  try {
    const client = getRedisClient();
    await client.del(key);
    return true;
  } catch (err) {
    console.error("Cache delete error:", err.message);
    return false;
  }
}

async function cacheDelPattern(pattern) {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
    return true;
  } catch (err) {
    console.error("Cache delete pattern error:", err.message);
    return false;
  }
}

module.exports = {
  getRedisClient,
  connectRedis,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
};