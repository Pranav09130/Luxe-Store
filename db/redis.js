// db/redis.js — Redis client with graceful fallback
// Supports both:
//   REDIS_URL=redis://redis:6379        (Docker / Railway)
//   REDIS_HOST + REDIS_PORT             (local Windows install)
const Redis = require("ioredis");

let client   = null;
let connected = false;

function createClient() {
  // Docker-compose sets REDIS_URL; local Windows sets REDIS_HOST/PORT
  const config = process.env.REDIS_URL
    ? process.env.REDIS_URL
    : {
        host:     process.env.REDIS_HOST     || "127.0.0.1",
        port:     parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD  || undefined,
      };

  const redis = new Redis(config, {
    lazyConnect:          true,
    maxRetriesPerRequest: 1,
    retryStrategy:        () => null,   // fail fast → graceful fallback
    enableOfflineQueue:   false,
  });

  redis.on("connect", () => {
    connected = true;
    console.log("✅  Redis connected");
  });

  redis.on("error", () => {
    connected = false;
  });

  redis.on("close", () => {
    connected = false;
  });

  return redis;
}

// Called once in server.js boot sequence
async function connectRedis() {
  try {
    client = createClient();
    await client.connect();
  } catch {
    console.log("⚠️   Redis not available — caching disabled, MongoDB used directly");
  }
}

// ── Low-level helpers ────────────────────────────────────────────────────────

async function get(key) {
  if (!connected || !client) return null;
  try {
    const val = await client.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function set(key, value, ttlSeconds = 300) {
  if (!connected || !client) return;
  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch { /* ignore */ }
}

// Supports wildcard patterns: del("cache:/api/products*")
async function del(...keys) {
  if (!connected || !client) return;
  try {
    for (const key of keys) {
      if (key.includes("*")) {
        const matched = await client.keys(key);
        if (matched.length) await client.del(...matched);
      } else {
        await client.del(key);
      }
    }
  } catch { /* ignore */ }
}

function isConnected() {
  return connected;
}

module.exports = { connectRedis, get, set, del, isConnected };
