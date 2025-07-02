/**
 * Caching system for a3t
 * Implements forever caching with nonce-based invalidation
 */

// In-memory cache
const cache = new Map();

/**
 * Get value from cache
 * @param {string} cacheKey - Cache key including context
 * @returns {Object|undefined} Cached value object with { found: boolean, value: any } or undefined
 */
function getCached(cacheKey) {
  return cache.get(cacheKey);
}

/**
 * Set value in cache
 * @param {string} cacheKey - Cache key including context
 * @param {boolean} found - Whether the asset was found
 * @param {any} value - The asset value (or undefined if not found)
 */
function setCached(cacheKey, found, value) {
  cache.set(cacheKey, { found, value });
}

/**
 * Clear entire cache (useful for testing or manual cache invalidation)
 */
function clearCache() {
  cache.clear();
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

module.exports = {
  getCached,
  setCached,
  clearCache,
  getCacheStats,
};