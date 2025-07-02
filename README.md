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
- **One API for all assets:** No more scattered config, i18n, and asset loading logic.
- **Framework-agnostic:** Designed for modern server frameworks.

## Why “a3t”?

- Short, unique, and memorable (stands for “asset”, using 3 for “s”).
- Easy to search for and avoids naming collisions.
- Instinctive, mirroring established i18n/config APIs, but generalized.

## Features

- **Unified API:** Retrieve any asset with `a3t.get(key, [defaultValue])` (or `a3t.__(key, [defaultValue])` for the i18 devs).
- **Filename-friendly keys:** Map directly to file paths, e.g., `prompts/summary.txt`.
- **Database overrides:** Live, context-sensitive customization (via MongoDB or pluggable backend).
- **Filesystem fallback:** Loads assets from disk if not overridden.
- **Inline defaults:** Rapid prototyping with a default value, optional.
- **Context-aware:** Supports language, workspace, system, buildHash, nonce, and more.
- **Forever-cached with nonce:** Cache resolved assets until the nonce changes for instant global invalidation.
- **Framework-agnostic:** Works in Meteor (server-side), Fastify, Express, and other Node.js frameworks.

## Supported Frameworks

- **Meteor (server-side):** Uses Meteor’s `Assets` API to load shipped assets.
- **Fastify/Express/Other Node.js:** Uses `fs`/`fs/promises` to read files from the filesystem.
- **Pluggable DB:** Default implementation uses MongoDB, but you can provide your own backend.

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


---

## Installation

```sh
npm install a3t
# or for Meteor projects
meteor npm install a3t
```

---

## Quick Start

### 1. Setup

```js
const { a3t, setA3tContext } = require('a3t');

// Set context at app startup or per-request/session
setA3tContext({
  language: 'en',
  workspace: 'myWorkspace',
  buildHash: process.env.BUILD_HASH,
  nonce: process.env.A3T_NONCE,   // Increment to invalidate cache
  system: 'ozwell',
});
```

### 2. Usage

#### Load a prompt (with optional inline default):
```js
const prompt = await a3t.get('prompts/summary.txt', 'Summarize the following...');
```

#### Load a template or binary asset:
```js
const template = await a3t.get('templates/note.xml', '<note></note>');
const logoPng = await a3t.get('images/logo.png'); // returns a Buffer
```

---

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

---

## Advanced Usage

### Setting Context Per Request

You can call `setA3tContext()` per request or session to provide user-specific or tenant-specific context.

### Forcing Cache Invalidation

After updating an override in the database, increment the `nonce` (e.g., `process.env.A3T_NONCE`) to make all clients re-resolve assets.

### Extending DB/Filesystem Backends

You can customize database and filesystem logic by extending the module (see API docs).

## License

MIT

---

## a3t Key Resolution Hierarchy

When `a3t.get('key', [defaultValue])` is called, the system resolves the value for the key using the following hierarchy, in order of precedence (first match wins):

### 1. Database Overrides (Most Specific → Least Specific)

a3t checks the database for an override, using the most specific match first. Context fields may include:

- **workspace**: The current workspace or organization context.
- **language**: Language (for i18n or localization).
- **system**: The system or deployment name (for multi-tenant or branded deployments).
- **key**: The asset’s key (filename-friendly path).

Resolution order (from most specific to least):

1. Match: workspace + language + key
2. Match: workspace + key
3. Match: language + key
4. Match: system + key
5. Match: key (global override)

### 2. Filesystem Assets

If no DB override is found, a3t attempts to load the asset from the filesystem (typically using Meteor’s `/private` directory):

- **Meteor**: Use `Assets.getText(key)` or `Assets.getBinary(key)` on the server.
- The key directly maps to a file path, e.g. `prompts/summary.txt` → `/private/prompts/summary.txt`.

### 3. Inline Default

If neither a DB override nor a filesystem asset exists, and the developer provided an inline `defaultValue`, a3t returns this value.

### 4. Not Found

If all above levels fail and no default is provided, a3t returns `undefined` or throws, depending on API design.  The not found is cached so future DB calls are not done until the nonce is incremented.

---

### Cache and Invalidation

- **Forever-Cached:** Once a value is resolved for a given key and context (including `buildHash` and `nonce`), the result is cached indefinitely for that combination.
- **Forcing Re-resolution:** To force clients to bypass the cache and re-resolve the value (e.g., after an override), the **`nonce`** must be incremented. This immediately invalidates the cache for all clients and causes the next `a3t.get()` call to perform a fresh lookup and caching cycle.
- **Best Practice:** Any admin or automation that updates overrides in the database must also increment the `nonce` value to ensure all clients see the new value.

---

### Visual Summary

```text
1. Database Override (workspace+language → workspace → language → system → global)
2. Filesystem Asset (by key)
3. Inline Default (optional)
4. Not Found (undefined or error)
(Cache is forever for a given nonce; increment nonce to invalidate)
```

---

### Example

Suppose you call:

```js
const prompt = await a3t.get('prompts/summary.txt', 'Summarize the following...');
```

Resolution proceeds as:

1. Is there a DB override for `prompts/summary.txt` for this workspace and language?
2. If not, is there a DB override for `prompts/summary.txt` for just this workspace?
3. If not, is there a DB override for `prompts/summary.txt` for just this language?
4. If not, is there a DB override for `prompts/summary.txt` for this system?
5. If not, is there a global DB override for `prompts/summary.txt`?
6. If not, does `/private/prompts/summary.txt` exist in the filesystem?
7. If not, use the provided default: `'Summarize the following...'`
8. If not, return `undefined`.

The result is cached forever for this `nonce`. To make a new override take effect, increment the `nonce`.

---

### Rationale

- **Most specific wins:** Ensures fine-grained customization when needed (e.g., workspace-specific branding, language, or prompt).
- **Filesystem fallback:** Enables shipping sensible defaults with the app.
- **Inline default:** Accelerates prototyping and reduces boilerplate.
- **Global override:** Supports organization-wide or system-wide changes without code changes.
- **Forever Cache with Nonce:** Guarantees maximum performance and stability, with simple, explicit invalidation.

---

### Notes

- If additional context (such as user, environment, or feature flag) is required, extend the hierarchy as appropriate, but always order from most-specific to least-specific.
- For cache invalidation, use `buildHash` or (preferably) `nonce` as part of the cache key. **Increment `nonce` to force all clients to reload assets or overrides immediately.**
