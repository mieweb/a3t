# a3t – Universal Overrideable Asset Loader

a3t is a universal, context-aware asset loader for JavaScript and TypeScript applications. It allows you to retrieve any overrideable resource—prompts, configuration, i18n strings, templates, JSON, XML, or binary assets—using a filename-friendly key. a3t supports hierarchical lookups (database overrides, filesystem, then inline defaults), caching, and context sensitivity (language, workspace, build hash, etc.), all with a focus on developer experience.

Modern applications frequently need to override configuration, language strings, prompts, or entire assets:
- **Rapid prototyping:** Developers want to hardcode defaults for speed, then override without redeploying.
- **Customization:** Organizations want to tweak behavior, branding, or messaging per workspace, language, or deployment.
- **Internationalization:** Seamless i18n often means overrides at various levels and contexts.
- **Live updates:** Some asset changes (e.g., prompts, templates) should be live-editable by admins or scripts, not just by shipping code.
- **Fast:** Forever-cache with explicit, instant invalidation.

## Features

- **Unified API:** Retrieve any asset with `a3t.get(key, [defaultValue])` (or `a3t.__(key, [defaultValue])` for the i18 devs).
- **Filename-friendly keys:** Map directly to file paths, e.g., `prompts/summary.txt`.
- **Database overrides:** Live, context-sensitive customization (via MongoDB or pluggable backend).
- **Filesystem fallback:** Loads assets from disk if not overridden.
- **Inline defaults:** Rapid prototyping with a default value, optional.
- **Context-aware:** Supports language, workspace, system, buildHash, nonce, and more.
- **Forever-cached with nonce:** Cache resolved assets until the nonce changes for instant global invalidation.
- **Framework-agnostic:** Works in Meteor (server-side), Fastify, Express, and other Node.js frameworks.

## Installation

```bash
npm install a3t
```

For Deno:
```typescript
import a3t from "https://deno.land/x/a3t/deno.ts";
```

## Quick Start

```javascript
const a3t = require('a3t');

// Initialize with filesystem backend
a3t.init({
  fs: { rootPath: './assets' },
  context: { language: 'en', workspace: 'default' }
});

// Get assets
const prompt = await a3t.get('prompts/summary.txt', 'Default summary prompt');
const config = await a3t.get('config/app.json', '{}');
const i18n = await a3t.__('i18n/welcome.txt', 'Welcome!');

// With context override
const spanishWelcome = await a3t.get('i18n/welcome.txt', 'Bienvenido!', { language: 'es' });

// Multiple assets
const assets = await a3t.getMultiple(['config/app.json', 'prompts/summary.txt']);
```

## Supported Frameworks

- **Meteor (server-side):** Uses Meteor's `Assets` API to load shipped assets.
- **Fastify/Express/Other Node.js:** Uses `fs`/`fs/promises` to read files from the filesystem.
- **Pluggable DB:** Default implementation uses MongoDB, but you can provide your own backend.

## Asset Resolution Hierarchy

When you call `a3t.get(key, [defaultValue])`, a3t resolves the key using the following steps:

1. **Database overrides** (most to least specific):
    - workspace + language + key
    - workspace + key
    - language + key
    - system + key
    - key (global)
2. **Filesystem asset:** Loads from disk using the key as the path (e.g., `private/prompts/summary.txt`).
3. **Inline default:** Uses the provided default value (if any).
4. **Not found:** Returns `undefined`.

> **Cache:** The resolved value is cached forever for the current context (including `nonce`) including misses from the DB. **To invalidate the cache and force all clients to reload assets, increment the `nonce`.**

## Example Directory Layout

```
assets/
  i18n/
    en.json
    es.json
  prompts/
    summary.txt
  templates/
    note.xml
  images/
    logo.png
```

## Advanced Usage

### Logging Configuration

a3t includes comprehensive logging using pino for performance-critical tracing. You can configure logging or disable it completely for production:

```javascript
// Enable logging with default settings
a3t.init({
  fs: { rootPath: './assets' },
  logging: { enabled: true }
});

// Configure pino logger options
a3t.init({
  fs: { rootPath: './assets' },
  logging: { 
    enabled: true,
    pino: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    }
  }
});

// Disable logging completely for production
a3t.init({
  fs: { rootPath: './assets' },
  logging: { enabled: false }
});
```

### Deno Support

a3t provides full Deno compatibility with TypeScript support:

```typescript
import a3t from "https://deno.land/x/a3t/deno.ts";

// Filesystem backend
a3t.init({
  fs: { rootPath: './assets' },
  context: { language: 'en' }
});

// HTTP backend for remote assets
a3t.init({
  fs: { httpBaseUrl: 'https://example.com/assets/' }
});

const asset = await a3t.get('prompts/summary.txt', 'Default');
```

### Setting Context Per Request

You can call `setA3tContext()` per request or session to provide user-specific or tenant-specific context.

```javascript
// Express middleware example
app.use((req, res, next) => {
  a3t.setContext({
    language: req.headers['accept-language']?.split(',')[0] || 'en',
    workspace: req.user?.workspace || 'default'
  });
  next();
});
```

### Database Backend Setup

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017');
await client.connect();

a3t.init({
  db: {
    mongodb: {
      client: client,
      database: 'myapp',
      collection: 'assets'
    }
  }
});
```

### Forcing Cache Invalidation

After updating an override in the database, increment the `nonce` to make all clients re-resolve assets.

```javascript
// After updating database overrides
a3t.incrementNonce();
```

### Extending DB/Filesystem Backends

You can customize database and filesystem logic by providing custom backends:

```javascript
// Custom database backend
a3t.setDbBackend({
  async findAsset(query) {
    // Your custom database logic
    return value || null;
  }
});

// Custom filesystem backend
a3t.setFsBackend({
  async readAsset(key) {
    // Your custom filesystem logic
    return content || null;
  },
  async readBinaryAsset(key) {
    // Your custom binary file logic
    return buffer || null;
  }
});
```

## Comparison to Existing Patterns

| Feature         | i18n Libraries (e.g., i18next) | Meteor Assets | Custom Config | **a3t**                |
|-----------------|-------------------------------|---------------|--------------|------------------------|
| Strings         | Yes                           | No            | Maybe        | **Yes**                |
| Binary Assets   | No                            | Yes           | No           | **Yes**                |
| Templates/XML   | No                            | Yes           | Maybe        | **Yes**                |
| DB Override     | Sometimes                     | No            | Sometimes    | **Yes**                |
| Fallback Chain  | i18n only                     | No            | No           | **Yes (DB→FS→inline)** |
| Context-aware   | Language only                 | No            | Maybe        | **Yes (full)**         |
| DX/Ease         | Good for i18n, not generic    | OK            | Varied       | **Excellent**          |

## API Reference

See [API.md](./API.md) for complete API documentation.

## Testing

```bash
npm test
```

The test suite includes 43 comprehensive tests covering:
- Context management and query hierarchy
- Caching behavior and invalidation
- Database backend functionality
- Filesystem backend operations
- Framework compatibility
- Error handling and edge cases

## Why "a3t"?

- Short, unique, and memorable (stands for "asset", using 3 for "s").
- Easy to search for and avoids naming collisions.
- Instinctive, mirroring established i18n/config APIs, but generalized.

## License

MPL-2.0