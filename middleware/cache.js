// middleware/cache.js
// Exports:
//   cacheMiddleware(ttl)          — route middleware: checks cache before DB, stores result after
//   invalidateCache(pattern)      — bust cache keys by exact key or wildcard pattern
//
// Used in routes as:
//   router.get("/", cacheMiddleware(300), handler)
//   await invalidateCache("cache:/api/products*")

const redis = require("../db/redis");

/**
 * cacheMiddleware(ttlSeconds)
 * Cache key = "cache:" + full request path + query string
 * e.g. GET /api/products?category=bags  →  "cache:/api/products?category=bags"
 */
function cacheMiddleware(ttlSeconds = 300) {
  return async (req, res, next) => {
    if (!redis.isConnected()) return next();   // Redis down → pass through

    const key = "cache:" + req.originalUrl;

    try {
      const cached = await redis.get(key);
      if (cached !== null) {
        res.setHeader("X-Cache", "HIT");
        return res.json(cached);
      }
    } catch {
      return next();
    }

    // Cache MISS — intercept res.json to store the response
    res.setHeader("X-Cache", "MISS");
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await redis.set(key, body, ttlSeconds);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * invalidateCache(pattern)
 * Deletes one key exactly, or all keys matching a wildcard pattern.
 * e.g. invalidateCache("cache:/api/products*")
 *      invalidateCache("cache:/api/users/admin/stats")
 */
async function invalidateCache(...patterns) {
  for (const pattern of patterns) {
    await redis.del(pattern);
  }
}

module.exports = { cacheMiddleware, invalidateCache };
