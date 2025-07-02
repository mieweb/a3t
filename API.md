# a3t API Reference

## Core API

### `a3t.get(key, [defaultValue], [contextOverride])`

Retrieve an asset using the a3t hierarchical resolution.

- **key** (string): Asset key (filename-friendly path)
- **defaultValue** (any, optional): Default value if asset not found
- **contextOverride** (object, optional): Context override for this request
- **Returns**: Promise<any> - Resolved asset value

### `a3t.__(key, [defaultValue], [contextOverride])`

Alias for `a3t.get()` - useful for i18n-style usage.

### `a3t.getBinary(key, [defaultValue], [contextOverride])`

Retrieve a binary asset.

- **Returns**: Promise<Buffer|undefined>

### `a3t.getMultiple(keys, [defaults], [contextOverride])`

Retrieve multiple assets concurrently.

- **keys** (string[]): Array of asset keys
- **defaults** (object, optional): Object mapping keys to default values
- **Returns**: Promise<object> - Object mapping keys to resolved values

## Configuration

### `a3t.init(config)`

Initialize a3t with configuration.

```javascript
a3t.init({
  db: {
    mongodb: {
      client: mongoClient,
      database: 'myapp',
      collection: 'assets'
    }
  },
  fs: {
    rootPath: './assets'
  },
  context: {
    language: 'en',
    system: 'production'
  }
});
```

### `a3t.setContext(context)`

Set the global a3t context.

### `a3t.getContext()`

Get the current global context.

### `a3t.incrementNonce()`

Increment the nonce to invalidate all caches.

## Backend Configuration

### Database Backends

```javascript
// MongoDB backend
a3t.setMongoDbBackend(client, 'database', 'collection');

// Custom backend
a3t.setDbBackend({
  async findAsset(query) {
    // Implementation
  }
});
```

### Filesystem Backends

```javascript
// Node.js filesystem
a3t.setNodeFsBackend('./assets');

// Meteor Assets
a3t.setMeteorAssetsBackend();

// Custom backend
a3t.setFsBackend({
  async readAsset(key) { /* Implementation */ },
  async readBinaryAsset(key) { /* Implementation */ }
});
```

## Context Fields

- **language**: Language code (e.g., 'en', 'es')
- **workspace**: Workspace/organization identifier
- **system**: System/deployment identifier
- **buildHash**: Build version identifier
- **nonce**: Cache invalidation counter
- **[custom]**: Additional custom context fields

## Asset Resolution Hierarchy

1. **Database overrides** (most to least specific):
   - workspace + language + key
   - workspace + key
   - language + key
   - system + key
   - key (global)
2. **Filesystem asset**: Load from disk using key as path
3. **Inline default**: Use provided default value
4. **Not found**: Return undefined

## Cache Management

### `a3t.clearCache()`

Clear the entire cache.

### `a3t.getCacheStats()`

Get cache statistics.

## Error Handling

a3t handles errors gracefully:

- Database connection failures: Falls back to filesystem
- Filesystem read errors: Falls back to default value
- Invalid paths: Returns null/undefined safely
- Path traversal attempts: Blocked for security

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import a3t from 'a3t';

const asset: string = await a3t.get('config/app.json', '{}');
```