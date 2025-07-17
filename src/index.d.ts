/**
 * TypeScript definitions for a3t - Universal Asset Loader
 */

export interface A3tContext {
  language?: string;
  workspace?: string;
  system?: string;
  buildHash?: string;
  nonce?: number;
  user?: string; // Added for Git backend user-level caching
  [key: string]: any; // Allow additional context fields
}

export interface DbBackend {
  findAsset(query: Record<string, any>): Promise<any>;
}

export interface FsBackend {
  readAsset(key: string): Promise<string | null>;
  readBinaryAsset(key: string): Promise<Buffer | null>;
}

export interface GitCredentials {
  username?: string;
  password?: string;
  token?: string;
}

export interface GitFsConfig {
  repoUrl: string;
  branch?: string;
  tag?: string;
  commit?: string;
  scope?: 'workspace' | 'user';
  cachePath?: string;
  credentials?: GitCredentials;
  autoFetch?: boolean;
  fetchInterval?: number;
}

export interface MongoDbConfig {
  client: any; // MongoDB client
  database?: string;
  collection?: string;
}

export interface LoggingConfig {
  enabled?: boolean;
  pino?: Record<string, any>;
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
    git?: GitFsConfig;
  };
  context?: A3tContext;
  logging?: LoggingConfig;
}

export interface CacheStats {
  size: number;
  keys: string[];
}

export interface SecretProvider {
  getSecret(key: string): Promise<string | null>;
  setSecret?(key: string, value: string): Promise<void>;
  isAvailable(): Promise<boolean>;
}

export interface SecretStore {
  registerProvider(name: string, provider: SecretProvider): void;
  getProvider(name: string): SecretProvider | null;
  setDefaultProvider(provider: string | SecretProvider): void;
  getSecret(key: string): Promise<string | null>;
  setSecret(key: string, value: string): Promise<boolean>;
  clearMemorySecrets(): void;
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
  setGitFsBackend(config: GitFsConfig): void;
  autoDetectFsBackend(): void;
  getFsBackend(): FsBackend | null;
  
  // Cache management
  clearCache(): void;
  getCacheStats(): CacheStats;
  
  // Logging
  initLogging(config?: LoggingConfig): void;
  getLogger(): any;
  
  // Secret management
  secretStore: SecretStore;
}

declare const a3t: A3t;
export default a3t;

// For CommonJS compatibility
export = a3t;