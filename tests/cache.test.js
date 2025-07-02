/**
 * Tests for a3t caching system
 */

const test = require('node:test');
const assert = require('node:assert');

const { getCached, setCached, clearCache, getCacheStats } = require('../src/cache');

test('Caching System', async (t) => {
  // Clear cache before each test
  clearCache();
  
  await t.test('should cache and retrieve values', () => {
    const cacheKey = 'test-key';
    const value = 'test-value';
    
    // Should return undefined for non-existent key
    assert.equal(getCached(cacheKey), undefined);
    
    // Set and retrieve
    setCached(cacheKey, true, value);
    const cached = getCached(cacheKey);
    
    assert.equal(cached.found, true);
    assert.equal(cached.value, value);
  });
  
  await t.test('should cache misses', () => {
    const cacheKey = 'miss-key';
    
    setCached(cacheKey, false, undefined);
    const cached = getCached(cacheKey);
    
    assert.equal(cached.found, false);
    assert.equal(cached.value, undefined);
  });
  
  await t.test('should clear cache', () => {
    setCached('key1', true, 'value1');
    setCached('key2', true, 'value2');
    
    assert.notEqual(getCached('key1'), undefined);
    assert.notEqual(getCached('key2'), undefined);
    
    clearCache();
    
    assert.equal(getCached('key1'), undefined);
    assert.equal(getCached('key2'), undefined);
  });
  
  await t.test('should provide cache statistics', () => {
    clearCache();
    
    setCached('key1', true, 'value1');
    setCached('key2', false, undefined);
    
    const stats = getCacheStats();
    
    assert.equal(stats.size, 2);
    assert.equal(stats.keys.includes('key1'), true);
    assert.equal(stats.keys.includes('key2'), true);
  });
  
  await t.test('should handle complex values', () => {
    const cacheKey = 'complex-key';
    const complexValue = {
      nested: {
        array: [1, 2, 3],
        string: 'test'
      }
    };
    
    setCached(cacheKey, true, complexValue);
    const cached = getCached(cacheKey);
    
    assert.equal(cached.found, true);
    assert.deepEqual(cached.value, complexValue);
  });
});