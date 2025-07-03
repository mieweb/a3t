/**
 * Logging module for a3t with pino support and production disable option
 */

let logger = null;
let isLoggingEnabled = true;

/**
 * Initialize logging with pino or disable completely
 * @param {Object} options - Logging configuration
 * @param {boolean} options.enabled - Whether logging is enabled (default: true)
 * @param {Object} options.pino - Pino configuration options
 */
function initLogging(options = {}) {
  isLoggingEnabled = options.enabled !== false;
  
  if (!isLoggingEnabled) {
    logger = createNoopLogger();
    return;
  }

  try {
    const pino = require('pino');
    const pinoOptions = {
      level: 'info',
      ...options.pino
    };
    
    logger = pino(pinoOptions);
  } catch (err) {
    // Fallback to console if pino is not available
    logger = createConsoleLogger();
  }
}

/**
 * Create a no-op logger for production when logging is disabled
 */
function createNoopLogger() {
  const noop = () => {};
  return {
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: () => createNoopLogger()
  };
}

/**
 * Create a simple console-based logger as fallback
 */
function createConsoleLogger() {
  return {
    trace: (...args) => console.debug('[a3t:trace]', ...args),
    debug: (...args) => console.debug('[a3t:debug]', ...args),
    info: (...args) => console.info('[a3t:info]', ...args),
    warn: (...args) => console.warn('[a3t:warn]', ...args),
    error: (...args) => console.error('[a3t:error]', ...args),
    fatal: (...args) => console.error('[a3t:fatal]', ...args),
    child: (bindings) => createConsoleLogger()
  };
}

/**
 * Get the current logger instance
 */
function getLogger() {
  if (!logger) {
    initLogging(); // Initialize with defaults if not already done
  }
  return logger;
}

/**
 * Log a resolution step with context for tracing
 */
function logResolution(step, key, context, result) {
  if (!isLoggingEnabled) return;
  
  const log = getLogger();
  log.info({
    step,
    key,
    context: context || {},
    found: result !== null && result !== undefined,
    resultType: result ? typeof result : 'undefined',
    resultLength: result && typeof result === 'string' ? result.length : undefined
  }, `Asset resolution: ${step}`);
}

/**
 * Log cache operations
 */
function logCache(operation, key, context, hit) {
  if (!isLoggingEnabled) return;
  
  const log = getLogger();
  log.debug({
    operation,
    key,
    context: context || {},
    hit: hit === true
  }, `Cache ${operation}`);
}

/**
 * Log backend operations
 */
function logBackend(backend, operation, key, success, error) {
  if (!isLoggingEnabled) return;
  
  const log = getLogger();
  const logLevel = error ? 'warn' : 'debug';
  log[logLevel]({
    backend,
    operation,
    key,
    success: success === true,
    error: error ? error.message : undefined
  }, `Backend ${backend}: ${operation}`);
}

module.exports = {
  initLogging,
  getLogger,
  logResolution,
  logCache,
  logBackend
};