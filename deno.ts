/**
 * a3t - Universal Asset Loader for Deno
 * Deno-compatible version with filesystem and fetch-based backends
 */

// Deno-compatible modules
import { join, resolve } from "https://deno.land/std@0.208.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.208.0/fs/mod.ts";

// Internal modules - simplified for Deno
interface A3tContext {
  language?: string;
  workspace?: string;
  system?: string;
  buildHash?: string;
  nonce?: number;
  [key: string]: any;
}

// Global context
let globalContext: A3tContext = { nonce: 1 };

// Simple cache implementation
const cache = new Map<string, { found: boolean; value: any }>();

// Logging - simplified for Deno
let isLoggingEnabled = true;

function log(level: string, message: string, data?: any) {
  if (!isLoggingEnabled) return;
  
  const logEntry = {
    level,
    time: Date.now(),
    msg: message,
    ...data
  };
  
  console.log(JSON.stringify(logEntry));
}

// Context management
function setA3tContext(context: Partial<A3tContext>) {
  globalContext = { ...globalContext, ...context };
}

function getA3tContext(): A3tContext {
  return { ...globalContext };
}

function getCacheKey(key: string, contextOverride: Partial<A3tContext> = {}): string {
  const context = { ...globalContext, ...contextOverride };
  return JSON.stringify({ key, context });
}

// Database backend interface
interface DbBackend {
  findAsset(query: any): Promise<string | null>;
}

// Filesystem backend interface  
interface FsBackend {
  readAsset(key: string): Promise<string | null>;
  readBinaryAsset(key: string): Promise<Uint8Array | null>;
}

// Default Deno filesystem backend
class DenoFsBackend implements FsBackend {
  constructor(private rootPath: string = './assets') {}
  
  async readAsset(key: string): Promise<string | null> {
    try {
      const fullPath = join(this.rootPath, key);
      
      // Security check: ensure path is within root
      const resolvedPath = resolve(fullPath);
      const resolvedRoot = resolve(this.rootPath);
      
      if (!resolvedPath.startsWith(resolvedRoot + '/') && resolvedPath !== resolvedRoot) {
        throw new Error('Path traversal not allowed');
      }
      
      const content = await Deno.readTextFile(fullPath);
      log('debug', 'Backend deno-fs: readAsset', { key, success: true });
      return content;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        log('debug', 'Backend deno-fs: readAsset', { key, success: false });
        return null;
      }
      log('warn', 'Backend deno-fs: readAsset', { key, success: false, error: error.message });
      return null;
    }
  }
  
  async readBinaryAsset(key: string): Promise<Uint8Array | null> {
    try {
      const fullPath = join(this.rootPath, key);
      
      // Security check: ensure path is within root
      const resolvedPath = resolve(fullPath);
      const resolvedRoot = resolve(this.rootPath);
      
      if (!resolvedPath.startsWith(resolvedRoot + '/') && resolvedPath !== resolvedRoot) {
        throw new Error('Path traversal not allowed');
      }
      
      const buffer = await Deno.readFile(fullPath);
      log('debug', 'Backend deno-fs: readBinaryAsset', { key, success: true });
      return buffer;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        log('debug', 'Backend deno-fs: readBinaryAsset', { key, success: false });
        return null;
      }
      log('warn', 'Backend deno-fs: readBinaryAsset', { key, success: false, error: error.message });
      return null;
    }
  }
}

// HTTP backend for remote assets
class HttpBackend implements FsBackend {
  constructor(private baseUrl: string) {}
  
  async readAsset(key: string): Promise<string | null> {
    try {
      const url = new URL(key, this.baseUrl);
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        log('debug', 'Backend http: readAsset', { key, success: false, status: response.status });
        return null;
      }
      
      const content = await response.text();
      log('debug', 'Backend http: readAsset', { key, success: true });
      return content;
    } catch (error) {
      log('warn', 'Backend http: readAsset', { key, success: false, error: error.message });
      return null;
    }
  }
  
  async readBinaryAsset(key: string): Promise<Uint8Array | null> {
    try {
      const url = new URL(key, this.baseUrl);
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        log('debug', 'Backend http: readBinaryAsset', { key, success: false, status: response.status });
        return null;
      }
      
      const buffer = await response.arrayBuffer();
      log('debug', 'Backend http: readBinaryAsset', { key, success: true });
      return new Uint8Array(buffer);
    } catch (error) {
      log('warn', 'Backend http: readBinaryAsset', { key, success: false, error: error.message });
      return null;
    }
  }
}

// Default backends
let dbBackend: DbBackend | null = null;
let fsBackend: FsBackend = new DenoFsBackend();

// Database query hierarchy generation
function getDbQueryHierarchy(key: string, contextOverride: Partial<A3tContext> = {}): any[] {
  const context = { ...globalContext, ...contextOverride };
  const queries = [];
  
  // Most specific to least specific
  if (context.workspace && context.language) {
    queries.push({ workspace: context.workspace, language: context.language, key });
  }
  if (context.workspace) {
    queries.push({ workspace: context.workspace, key });
  }
  if (context.language) {
    queries.push({ language: context.language, key });
  }
  if (context.system) {
    queries.push({ system: context.system, key });
  }
  queries.push({ key }); // Global
  
  return queries;
}

// Database query execution
async function queryDatabase(queries: any[]): Promise<string | null> {
  if (!dbBackend) return null;
  
  for (const query of queries) {
    try {
      const result = await dbBackend.findAsset(query);
      if (result !== null) {
        return result;
      }
    } catch (error) {
      log('warn', 'Database query error', { query, error: error.message });
    }
  }
  
  return null;
}

// Asset resolution
async function resolveAsset(
  key: string, 
  defaultValue: any = undefined, 
  contextOverride: Partial<A3tContext> = {}, 
  binary = false
): Promise<any> {
  const cacheKey = getCacheKey(key, contextOverride);
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    log('debug', 'Cache hit', { key, context: contextOverride });
    return cached.found ? cached.value : defaultValue;
  }
  
  log('debug', 'Cache miss', { key, context: contextOverride });
  
  try {
    // 1. Database overrides
    const dbQueries = getDbQueryHierarchy(key, contextOverride);
    const dbResult = await queryDatabase(dbQueries);
    
    if (dbResult !== null) {
      log('info', 'Asset resolution: database', { key, context: contextOverride, found: true });
      cache.set(cacheKey, { found: true, value: dbResult });
      return dbResult;
    }
    
    // 2. Filesystem asset
    const fsResult = binary 
      ? await fsBackend.readBinaryAsset(key)
      : await fsBackend.readAsset(key);
    
    if (fsResult !== null) {
      log('info', 'Asset resolution: filesystem', { key, context: contextOverride, found: true });
      cache.set(cacheKey, { found: true, value: fsResult });
      return fsResult;
    }
    
    // 3. Default value
    if (defaultValue !== undefined) {
      log('info', 'Asset resolution: default', { key, context: contextOverride, found: true });
      cache.set(cacheKey, { found: true, value: defaultValue });
      return defaultValue;
    }
    
    // 4. Not found
    log('info', 'Asset resolution: not_found', { key, context: contextOverride, found: false });
    cache.set(cacheKey, { found: false, value: undefined });
    return undefined;
    
  } catch (error) {
    log('warn', 'Asset resolution: error', { key, context: contextOverride, error: error.message });
    
    if (defaultValue !== undefined) {
      cache.set(cacheKey, { found: true, value: defaultValue });
      return defaultValue;
    }
    
    cache.set(cacheKey, { found: false, value: undefined });
    return undefined;
  }
}

// Configuration
interface A3tConfig {
  db?: {
    backend?: DbBackend;
  };
  fs?: {
    rootPath?: string;
    httpBaseUrl?: string;
    backend?: FsBackend;
  };
  context?: Partial<A3tContext>;
  logging?: {
    enabled?: boolean;
  };
}

function init(config: A3tConfig = {}) {
  // Initialize logging
  if (config.logging?.enabled === false) {
    isLoggingEnabled = false;
  }
  
  // Set database backend
  if (config.db?.backend) {
    dbBackend = config.db.backend;
  }
  
  // Set filesystem backend
  if (config.fs?.backend) {
    fsBackend = config.fs.backend;
  } else if (config.fs?.httpBaseUrl) {
    fsBackend = new HttpBackend(config.fs.httpBaseUrl);
  } else if (config.fs?.rootPath) {
    fsBackend = new DenoFsBackend(config.fs.rootPath);
  }
  
  // Set initial context
  if (config.context) {
    setA3tContext(config.context);
  }
}

// Multiple assets
async function getMultiple(keys: string[], defaults: Record<string, any> = {}, contextOverride: Partial<A3tContext> = {}): Promise<Record<string, any>> {
  const promises = keys.map(async (key) => {
    const value = await resolveAsset(key, defaults[key], contextOverride);
    return [key, value] as [string, any];
  });
  
  const results = await Promise.all(promises);
  return Object.fromEntries(results);
}

// Cache management
function clearCache() {
  cache.clear();
}

function incrementNonce(): number {
  const newNonce = globalContext.nonce! + 1;
  setA3tContext({ nonce: newNonce });
  clearCache();
  return newNonce;
}

// Main API
const a3t = {
  // Core API
  get: resolveAsset,
  __: resolveAsset,
  getBinary: (key: string, defaultValue?: any, contextOverride?: Partial<A3tContext>) => 
    resolveAsset(key, defaultValue, contextOverride, true),
  getMultiple,
  
  // Configuration
  init,
  setContext: setA3tContext,
  getContext: getA3tContext,
  incrementNonce,
  
  // Cache management
  clearCache,
  
  // Backend classes for custom implementations
  DenoFsBackend,
  HttpBackend,
};

export default a3t;
export {
  a3t,
  type A3tConfig,
  type A3tContext,
  type DbBackend,
  type FsBackend,
  DenoFsBackend,
  HttpBackend,
};