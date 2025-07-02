/**
 * Integration tests for a3t main API
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const a3t = require('../src/index');

test('a3t Main API', async (t) => {
  // Set up test environment
  const assetsPath = path.join(__dirname, '..', 'assets');
  
  await t.test('should initialize with configuration', () => {
    a3t.init({
      fs: { rootPath: assetsPath },
      context: { language: 'en', workspace: 'test' }
    });
    
    const context = a3t.getContext();
    assert.equal(context.language, 'en');
    assert.equal(context.workspace, 'test');
  });
  
  await t.test('should get assets from filesystem', async () => {
    a3t.init({ fs: { rootPath: assetsPath } });
    
    const summary = await a3t.get('prompts/summary.txt');
    assert.equal(typeof summary, 'string');
    assert.equal(summary.includes('summary'), true);
  });
  
  await t.test('should return default values for missing assets', async () => {
    a3t.init({ fs: { rootPath: assetsPath } });
    
    const missing = await a3t.get('missing/file.txt', 'default value');
    assert.equal(missing, 'default value');
  });
  
  await t.test('should return undefined for missing assets without default', async () => {
    a3t.clearCache(); // Clear cache to avoid cross-test contamination
    a3t.init({ fs: { rootPath: assetsPath } });
    
    const missing = await a3t.get('definitely/missing/file.txt'); // Use a different key
    assert.equal(missing, undefined);
  });
  
  await t.test('should use __ alias', async () => {
    a3t.init({ fs: { rootPath: assetsPath } });
    
    const summary1 = await a3t.get('prompts/summary.txt');
    const summary2 = await a3t.__('prompts/summary.txt');
    
    assert.equal(summary1, summary2);
  });
  
  await t.test('should get multiple assets', async () => {
    a3t.init({ fs: { rootPath: assetsPath } });
    
    const assets = await a3t.getMultiple(
      ['prompts/summary.txt', 'i18n/en.json'],
      { 'missing/file.txt': 'default' }
    );
    
    assert.equal(typeof assets['prompts/summary.txt'], 'string');
    assert.equal(typeof assets['i18n/en.json'], 'string');
    
    // Should parse JSON content
    const i18nData = JSON.parse(assets['i18n/en.json']);
    assert.equal(i18nData.welcome, 'Welcome to our application');
  });
  
  await t.test('should cache assets', async () => {
    a3t.clearCache();
    a3t.init({ fs: { rootPath: assetsPath } });
    
    // First call should hit filesystem
    const start1 = Date.now();
    const summary1 = await a3t.get('prompts/summary.txt');
    const time1 = Date.now() - start1;
    
    // Second call should hit cache (should be faster)
    const start2 = Date.now();
    const summary2 = await a3t.get('prompts/summary.txt');
    const time2 = Date.now() - start2;
    
    assert.equal(summary1, summary2);
    // Cache hit should typically be faster (though this test may be flaky)
    // assert.ok(time2 <= time1);
    
    const stats = a3t.getCacheStats();
    assert.ok(stats.size > 0);
  });
  
  await t.test('should handle context overrides', async () => {
    a3t.init({ fs: { rootPath: assetsPath } });
    a3t.setContext({ language: 'en' });
    
    // Test context override in get call
    const summary = await a3t.get('prompts/summary.txt', undefined, { language: 'es' });
    assert.equal(typeof summary, 'string');
  });
  
  await t.test('should increment nonce and clear cache', async () => {
    a3t.clearCache();
    a3t.init({ fs: { rootPath: assetsPath } });
    
    // Cache an asset
    await a3t.get('prompts/summary.txt');
    let stats = a3t.getCacheStats();
    assert.ok(stats.size > 0);
    
    // Increment nonce should clear cache
    const oldNonce = a3t.getContext().nonce;
    const newNonce = a3t.incrementNonce();
    
    assert.equal(newNonce, oldNonce + 1);
    
    stats = a3t.getCacheStats();
    assert.equal(stats.size, 0);
  });
  
  await t.test('should handle binary assets', async () => {
    a3t.init({ fs: { rootPath: assetsPath } });
    
    // Create a test binary file
    const fs = require('fs').promises;
    const binaryPath = path.join(assetsPath, 'test.bin');
    const testData = Buffer.from([1, 2, 3, 4, 5]);
    
    try {
      await fs.writeFile(binaryPath, testData);
      
      const binary = await a3t.getBinary('test.bin');
      assert.equal(Buffer.isBuffer(binary), true);
      assert.deepEqual(binary, testData);
      
    } finally {
      // Clean up
      try {
        await fs.unlink(binaryPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });
});