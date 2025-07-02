/**
 * Context management for a3t
 * Handles global and per-request context including language, workspace, system, buildHash, nonce
 */

let globalContext = {
  language: null,
  workspace: null,
  system: null,
  buildHash: process.env.A3T_BUILD_HASH || 'default',
  nonce: parseInt(process.env.A3T_NONCE || '0'),
  // Allow additional context fields for extensibility
};

/**
 * Set the global a3t context
 * @param {Object} context - Context object with optional fields: language, workspace, system, buildHash, nonce
 */
function setA3tContext(context = {}) {
  globalContext = {
    ...globalContext,
    ...context,
  };
}

/**
 * Get the current global context
 * @returns {Object} Current global context
 */
function getA3tContext() {
  return { ...globalContext };
}

/**
 * Get a context-specific cache key
 * @param {string} key - Asset key
 * @param {Object} contextOverride - Optional context override for this request
 * @returns {string} Cache key that includes context
 */
function getCacheKey(key, contextOverride = {}) {
  const context = { ...globalContext, ...contextOverride };
  const { language, workspace, system, buildHash, nonce } = context;
  
  // Create a deterministic cache key that includes all context
  return JSON.stringify({
    key,
    language,
    workspace,
    system,
    buildHash,
    nonce,
  });
}

/**
 * Generate database query hierarchy for asset resolution
 * Returns queries in order of specificity (most specific first)
 * @param {string} key - Asset key
 * @param {Object} contextOverride - Optional context override for this request
 * @returns {Array} Array of query objects for database lookup
 */
function getDbQueryHierarchy(key, contextOverride = {}) {
  const context = { ...globalContext, ...contextOverride };
  const { language, workspace, system } = context;
  
  const queries = [];
  
  // 1. workspace + language + key (most specific)
  if (workspace && language) {
    queries.push({ workspace, language, key });
  }
  
  // 2. workspace + key
  if (workspace) {
    queries.push({ workspace, key });
  }
  
  // 3. language + key
  if (language) {
    queries.push({ language, key });
  }
  
  // 4. system + key
  if (system) {
    queries.push({ system, key });
  }
  
  // 5. key (global override) - always include this
  queries.push({ key });
  
  return queries;
}

module.exports = {
  setA3tContext,
  getA3tContext,
  getCacheKey,
  getDbQueryHierarchy,
};