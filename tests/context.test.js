/**
 * Tests for a3t context management
 */

const test = require('node:test');
const assert = require('node:assert');

const { setA3tContext, getA3tContext, getCacheKey, getDbQueryHierarchy } = require('../src/context');

test('Context Management', async (t) => {
  await t.test('should set and get global context', () => {
    const context = {
      language: 'en',
      workspace: 'test-workspace',
      system: 'test-system'
    };
    
    setA3tContext(context);
    const retrieved = getA3tContext();
    
    assert.equal(retrieved.language, 'en');
    assert.equal(retrieved.workspace, 'test-workspace');
    assert.equal(retrieved.system, 'test-system');
  });
  
  await t.test('should generate cache keys with context', () => {
    setA3tContext({
      language: 'en',
      workspace: 'ws1',
      nonce: 5
    });
    
    const cacheKey = getCacheKey('test/key');
    const parsed = JSON.parse(cacheKey);
    
    assert.equal(parsed.key, 'test/key');
    assert.equal(parsed.language, 'en');
    assert.equal(parsed.workspace, 'ws1');
    assert.equal(parsed.nonce, 5);
  });
  
  await t.test('should generate database query hierarchy', () => {
    setA3tContext({
      language: 'en',
      workspace: 'ws1',
      system: 'sys1'
    });
    
    const queries = getDbQueryHierarchy('test/key');
    
    assert.equal(queries.length, 5);
    assert.deepEqual(queries[0], { workspace: 'ws1', language: 'en', key: 'test/key' });
    assert.deepEqual(queries[1], { workspace: 'ws1', key: 'test/key' });
    assert.deepEqual(queries[2], { language: 'en', key: 'test/key' });
    assert.deepEqual(queries[3], { system: 'sys1', key: 'test/key' });
    assert.deepEqual(queries[4], { key: 'test/key' });
  });
  
  await t.test('should handle partial context in query hierarchy', () => {
    // Reset context completely first
    setA3tContext({
      language: 'en',
      workspace: null,
      system: null,
      buildHash: 'default',
      nonce: 0
    });
    
    const queries = getDbQueryHierarchy('test/key');
    
    assert.equal(queries.length, 2); // only language + key and key
    assert.deepEqual(queries[0], { language: 'en', key: 'test/key' });
    assert.deepEqual(queries[1], { key: 'test/key' });
  });
  
  await t.test('should merge context overrides', () => {
    setA3tContext({
      language: 'en',
      workspace: 'ws1'
    });
    
    const queries = getDbQueryHierarchy('test/key', { language: 'es' });
    
    // Should use overridden language 'es' instead of 'en'
    assert.deepEqual(queries[0], { workspace: 'ws1', language: 'es', key: 'test/key' });
    assert.deepEqual(queries[1], { workspace: 'ws1', key: 'test/key' });
    assert.deepEqual(queries[2], { language: 'es', key: 'test/key' });
  });
});