/**
 * TypeScript definitions for a3t - Universal Asset Loader
 */

export interface A3tContext {
  language?: string;
  workspace?: string;
  system?: string;
  buildHash?: string;
  nonce?: number;
  [key: string]: any; // Allow additional context fields
}

export interface DbBackend {
  findAsset(query: Record<string, any>): Promise<any>;
}

export interface FsBackend {
  readAsset(key: string): Promise<string | null>;
  readBinaryAsset(key: string): Promise<Buffer | null>;
}

export interface MongoDbConfig {
  client: any; // MongoDB client
  database?: string;
  collection?: string;
}

export interface A3tConfig {
  db?: {
    mongodb?: MongoDbConfig;
    backend?: DbBackend;
  };
  fs?: {
    rootPath?: string;
    meteor?: boolean;
    backend?: FsBackend;
  };
  context?: A3tContext;
}

export interface CacheStats {
  size: number;
  keys: string[];
}

export interface A3t {
  // Core API
  get(key: string, defaultValue?: any, contextOverride?: A3tContext): Promise<any>;
  __(key: string, defaultValue?: any, contextOverride?: A3tContext): Promise<any>;
  getBinary(key: string, defaultValue?: Buffer, contextOverride?: A3tContext): Promise<Buffer | undefined>;
  getMultiple(keys: string[], defaults?: Record<string, any>, contextOverride?: A3tContext): Promise<Record<string, any>>;
  
  // Configuration
  init(config?: A3tConfig): void;
  setContext(context: A3tContext): void;
  getContext(): A3tContext;
  incrementNonce(): number;
  
  // Backend configuration
  setDbBackend(backend: DbBackend): void;
  setMongoDbBackend(client: any, databaseName?: string, collectionName?: string): void;
  getDbBackend(): DbBackend | null;
  setFsBackend(backend: FsBackend): void;
  setNodeFsBackend(rootPath?: string): void;
  setMeteorAssetsBackend(): void;
  autoDetectFsBackend(): void;
  getFsBackend(): FsBackend | null;
  
  // Cache management
  clearCache(): void;
  getCacheStats(): CacheStats;
}

declare const a3t: A3t;
export default a3t;

// For CommonJS compatibility
export = a3t;