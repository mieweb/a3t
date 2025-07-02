/**
 * a3t - Universal Asset Loader
 * Main module that provides the unified API for asset retrieval
 */

const { setA3tContext, getA3tContext } = require('./context');
const { clearCache, getCacheStats } = require('./cache');
const { setDbBackend, setMongoDbBackend, getDbBackend } = require('./db-backend');
const { setFsBackend, setNodeFsBackend, setMeteorAssetsBackend, autoDetectFsBackend, getFsBackend } = require('./fs-backend');
const { resolveAsset, resolveAssets } = require('./resolver');

/**
 * Get an asset using the a3t hierarchical resolution
 * @param {string} key - Asset key (filename-friendly path)
 * @param {any} defaultValue - Default value if asset not found
 * @param {Object} contextOverride - Optional context override for this request
 * @returns {Promise<any>} Resolved asset value
 */
async function get(key, defaultValue = undefined, contextOverride = {}) {
  return await resolveAsset(key, defaultValue, contextOverride);
}

/**
 * Get an asset (alias for i18n-style usage)
 * @param {string} key - Asset key (filename-friendly path)
 * @param {any} defaultValue - Default value if asset not found
 * @param {Object} contextOverride - Optional context override for this request
 * @returns {Promise<any>} Resolved asset value
 */
async function __(key, defaultValue = undefined, contextOverride = {}) {
  return await get(key, defaultValue, contextOverride);
}

/**
 * Get a binary asset
 * @param {string} key - Asset key (filename-friendly path)
 * @param {Buffer} defaultValue - Default binary value if asset not found
 * @param {Object} contextOverride - Optional context override for this request
 * @returns {Promise<Buffer|undefined>} Resolved binary asset
 */
async function getBinary(key, defaultValue = undefined, contextOverride = {}) {
  return await resolveAsset(key, defaultValue, contextOverride, true);
}

/**
 * Get multiple assets concurrently
 * @param {Array} keys - Array of asset keys
 * @param {Object} defaults - Object mapping keys to default values
 * @param {Object} contextOverride - Optional context override for this request
 * @returns {Promise<Object>} Object mapping keys to resolved values
 */
async function getMultiple(keys, defaults = {}, contextOverride = {}) {
  return await resolveAssets(keys, defaults, contextOverride);
}

/**
 * Initialize a3t with configuration
 * @param {Object} config - Configuration object
 * @param {Object} config.db - Database configuration
 * @param {Object} config.fs - Filesystem configuration
 * @param {Object} config.context - Initial context
 */
function init(config = {}) {
  // Set up database backend if provided
  if (config.db) {
    if (config.db.mongodb) {
      const { client, database, collection } = config.db.mongodb;
      setMongoDbBackend(client, database, collection);
    } else if (config.db.backend) {
      setDbBackend(config.db.backend);
    }
  }
  
  // Set up filesystem backend if provided
  if (config.fs) {
    if (config.fs.rootPath) {
      setNodeFsBackend(config.fs.rootPath);
    } else if (config.fs.meteor) {
      setMeteorAssetsBackend();
    } else if (config.fs.backend) {
      setFsBackend(config.fs.backend);
    }
  } else {
    // Auto-detect filesystem backend
    autoDetectFsBackend();
  }
  
  // Set initial context if provided
  if (config.context) {
    setA3tContext(config.context);
  }
}

/**
 * Increment the nonce to invalidate all caches
 * @returns {number} New nonce value
 */
function incrementNonce() {
  const context = getA3tContext();
  const newNonce = context.nonce + 1;
  setA3tContext({ ...context, nonce: newNonce });
  clearCache();
  return newNonce;
}

// Main a3t object with all public methods
const a3t = {
  // Core API
  get,
  __,
  getBinary,
  getMultiple,
  
  // Configuration
  init,
  setContext: setA3tContext,
  getContext: getA3tContext,
  incrementNonce,
  
  // Backend configuration
  setDbBackend,
  setMongoDbBackend,
  getDbBackend,
  setFsBackend,
  setNodeFsBackend,
  setMeteorAssetsBackend,
  autoDetectFsBackend,
  getFsBackend,
  
  // Cache management
  clearCache,
  getCacheStats,
};

// Auto-initialize with default settings
autoDetectFsBackend();

module.exports = a3t;