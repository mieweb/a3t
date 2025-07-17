/**
 * SecretStore for a3t
 * Secure management of Git credentials and other secrets
 * Supports environment variables, external secret managers, and pluggable providers
 */

const { getLogger } = require('./logging');

// Secret store providers
const providers = new Map();
let defaultProvider = null;

/**
 * Interface for secret providers
 */
class SecretProvider {
  /**
   * Get a secret value
   * @param {string} key - Secret key
   * @returns {Promise<string|null>} Secret value or null if not found
   */
  async getSecret(key) {
    throw new Error('getSecret method must be implemented');
  }

  /**
   * Set a secret value (optional, not all providers support this)
   * @param {string} key - Secret key
   * @param {string} value - Secret value
   * @returns {Promise<void>}
   */
  async setSecret(key, value) {
    throw new Error('setSecret method not supported by this provider');
  }

  /**
   * Check if provider is available
   * @returns {Promise<boolean>} True if provider is available
   */
  async isAvailable() {
    return true;
  }
}

/**
 * Environment variables secret provider
 */
class EnvironmentProvider extends SecretProvider {
  constructor(prefix = 'A3T_') {
    super();
    this.prefix = prefix;
  }

  async getSecret(key) {
    const envKey = this.prefix + key.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const value = process.env[envKey];
    
    if (value !== undefined) {
      const logger = getLogger();
      logger?.debug({ provider: 'environment', key: envKey, found: true }, 'Secret retrieved from environment');
      return value;
    }
    
    return null;
  }

  async isAvailable() {
    return typeof process !== 'undefined' && process.env !== undefined;
  }
}

/**
 * In-memory secret provider (for testing and temporary secrets)
 */
class MemoryProvider extends SecretProvider {
  constructor() {
    super();
    this.secrets = new Map();
  }

  async getSecret(key) {
    const value = this.secrets.get(key);
    
    if (value !== undefined) {
      const logger = getLogger();
      logger?.debug({ provider: 'memory', key, found: true }, 'Secret retrieved from memory');
      return value;
    }
    
    return null;
  }

  async setSecret(key, value) {
    this.secrets.set(key, value);
    const logger = getLogger();
    logger?.debug({ provider: 'memory', key, action: 'set' }, 'Secret stored in memory');
  }

  clear() {
    this.secrets.clear();
  }
}

/**
 * Composite provider that tries multiple providers in order
 */
class CompositeProvider extends SecretProvider {
  constructor(providers = []) {
    super();
    this.providers = providers;
  }

  async getSecret(key) {
    for (const provider of this.providers) {
      try {
        if (await provider.isAvailable()) {
          const value = await provider.getSecret(key);
          if (value !== null) {
            return value;
          }
        }
      } catch (error) {
        const logger = getLogger();
        logger?.warn({ provider: provider.constructor.name, key, error: error.message }, 'Secret provider error');
      }
    }
    
    return null;
  }

  async setSecret(key, value) {
    // Try to set on the first provider that supports setting
    for (const provider of this.providers) {
      try {
        if (await provider.isAvailable()) {
          await provider.setSecret(key, value);
          return; // Success - stop trying other providers
        }
      } catch (error) {
        // Provider doesn't support setting, try next one
        continue;
      }
    }
    
    // If we get here, no provider supported setting
    throw new Error('No provider supports setting secrets');
  }

  async isAvailable() {
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Register a secret provider
 * @param {string} name - Provider name
 * @param {SecretProvider} provider - Provider instance
 */
function registerProvider(name, provider) {
  if (!(provider instanceof SecretProvider)) {
    throw new Error('Provider must extend SecretProvider class');
  }
  
  providers.set(name, provider);
  const logger = getLogger();
  logger?.info({ provider: name }, 'Secret provider registered');
}

/**
 * Get a registered provider
 * @param {string} name - Provider name
 * @returns {SecretProvider|null} Provider instance or null if not found
 */
function getProvider(name) {
  return providers.get(name) || null;
}

/**
 * Set the default provider
 * @param {string|SecretProvider} provider - Provider name or instance
 */
function setDefaultProvider(provider) {
  if (typeof provider === 'string') {
    defaultProvider = getProvider(provider);
    if (!defaultProvider) {
      throw new Error(`Provider '${provider}' not found`);
    }
  } else if (provider instanceof SecretProvider) {
    defaultProvider = provider;
  } else {
    throw new Error('Provider must be a string name or SecretProvider instance');
  }
  
  const logger = getLogger();
  logger?.info({ provider: provider.constructor?.name || provider }, 'Default secret provider set');
}

/**
 * Initialize with default providers
 */
function initializeDefaultProviders() {
  // Register default providers
  registerProvider('environment', new EnvironmentProvider());
  registerProvider('memory', new MemoryProvider());
  
  // Set up composite provider as default (env vars first, then memory)
  const compositeProvider = new CompositeProvider([
    getProvider('environment'),
    getProvider('memory')
  ]);
  
  setDefaultProvider(compositeProvider);
}

/**
 * Get a secret using the default provider
 * @param {string} key - Secret key
 * @returns {Promise<string|null>} Secret value or null if not found
 */
async function getSecret(key) {
  if (!defaultProvider) {
    initializeDefaultProviders();
  }
  
  try {
    const value = await defaultProvider.getSecret(key);
    const logger = getLogger();
    
    if (value !== null) {
      logger?.debug({ key, found: true }, 'Secret retrieved');
    } else {
      logger?.debug({ key, found: false }, 'Secret not found');
    }
    
    return value;
  } catch (error) {
    const logger = getLogger();
    logger?.error({ key, error: error.message }, 'Failed to retrieve secret');
    return null;
  }
}

/**
 * Set a secret using the default provider (if it supports setting)
 * @param {string} key - Secret key
 * @param {string} value - Secret value
 * @returns {Promise<boolean>} True if secret was set successfully
 */
async function setSecret(key, value) {
  if (!defaultProvider) {
    initializeDefaultProviders();
  }
  
  try {
    await defaultProvider.setSecret(key, value);
    const logger = getLogger();
    logger?.debug({ key }, 'Secret set successfully');
    return true;
  } catch (error) {
    const logger = getLogger();
    logger?.warn({ key, error: error.message }, 'Failed to set secret');
    return false;
  }
}

/**
 * Clear all secrets from memory provider (for testing)
 */
function clearMemorySecrets() {
  const memoryProvider = getProvider('memory');
  if (memoryProvider) {
    memoryProvider.clear();
  }
}

// Initialize default providers on module load
initializeDefaultProviders();

module.exports = {
  SecretProvider,
  EnvironmentProvider,
  MemoryProvider,
  CompositeProvider,
  registerProvider,
  getProvider,
  setDefaultProvider,
  getSecret,
  setSecret,
  clearMemorySecrets,
};