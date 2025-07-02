/**
 * Asset resolver for a3t
 * Implements the hierarchical resolution logic: DB → Filesystem → Default → Not Found
 */

const { getCacheKey, getDbQueryHierarchy } = require('./context');
const { getCached, setCached } = require('./cache');
const { queryDatabase } = require('./db-backend');
const { readFromFilesystem } = require('./fs-backend');

/**
 * Resolve asset using the a3t hierarchy
 * @param {string} key - Asset key
 * @param {any} defaultValue - Default value to return if asset not found
 * @param {Object} contextOverride - Optional context override for this request
 * @param {boolean} binary - Whether to read filesystem assets as binary
 * @returns {Promise<any>} Resolved asset value
 */
async function resolveAsset(key, defaultValue = undefined, contextOverride = {}, binary = false) {
  // Generate cache key including full context
  const cacheKey = getCacheKey(key, contextOverride);
  
  // Check cache first
  const cached = getCached(cacheKey);
  if (cached !== undefined) {
    return cached.found ? cached.value : defaultValue;
  }
  
  try {
    // 1. Database overrides (most to least specific)
    const dbQueries = getDbQueryHierarchy(key, contextOverride);
    const dbResult = await queryDatabase(dbQueries);
    
    if (dbResult !== null && dbResult !== undefined) {
      // Found in database - cache and return
      setCached(cacheKey, true, dbResult);
      return dbResult;
    }
    
    // 2. Filesystem asset
    const fsResult = await readFromFilesystem(key, binary);
    
    if (fsResult !== null && fsResult !== undefined) {
      // Found in filesystem - cache and return
      setCached(cacheKey, true, fsResult);
      return fsResult;
    }
    
    // 3. Inline default
    if (defaultValue !== undefined) {
      // Cache the default value result
      setCached(cacheKey, true, defaultValue);
      return defaultValue;
    }
    
    // 4. Not found - cache the miss
    setCached(cacheKey, false, undefined);
    return undefined;
    
  } catch (error) {
    console.warn('a3t: Asset resolution error:', error.message);
    
    // On error, try to return default or undefined
    if (defaultValue !== undefined) {
      setCached(cacheKey, true, defaultValue);
      return defaultValue;
    }
    
    // Cache the miss
    setCached(cacheKey, false, undefined);
    return undefined;
  }
}

/**
 * Resolve multiple assets concurrently
 * @param {Array} keys - Array of asset keys
 * @param {Object} defaults - Object mapping keys to default values
 * @param {Object} contextOverride - Optional context override for this request
 * @returns {Promise<Object>} Object mapping keys to resolved values
 */
async function resolveAssets(keys, defaults = {}, contextOverride = {}) {
  const promises = keys.map(key => 
    resolveAsset(key, defaults[key], contextOverride).then(value => [key, value])
  );
  
  const results = await Promise.all(promises);
  return Object.fromEntries(results);
}

module.exports = {
  resolveAsset,
  resolveAssets,
};