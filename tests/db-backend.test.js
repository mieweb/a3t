/**
 * Tests for a3t database backend
 */

const test = require('node:test');
const assert = require('node:assert');

const { MongoDbBackend, setDbBackend, queryDatabase } = require('../src/db-backend');

test('Database Backend', async (t) => {
  await t.test('should create MongoDbBackend with default values', () => {
    const mockClient = { db: () => ({ collection: () => ({}) }) };
    const backend = new MongoDbBackend(mockClient);
    
    assert.equal(backend.databaseName, 'a3t');
    assert.equal(backend.collectionName, 'assets');
  });
  
  await t.test('should create MongoDbBackend with custom values', () => {
    const mockClient = { db: () => ({ collection: () => ({}) }) };
    const backend = new MongoDbBackend(mockClient, 'custom-db', 'custom-collection');
    
    assert.equal(backend.databaseName, 'custom-db');
    assert.equal(backend.collectionName, 'custom-collection');
  });
  
  await t.test('should handle database query with mock backend', async () => {
    // Create a mock backend
    const mockBackend = {
      async findAsset(query) {
        if (query.key === 'test-key' && query.workspace === 'test-ws') {
          return 'workspace-specific-value';
        }
        if (query.key === 'test-key') {
          return 'global-value';
        }
        return null;
      }
    };
    
    setDbBackend(mockBackend);
    
    // Test hierarchical query
    const queries = [
      { workspace: 'test-ws', key: 'test-key' },
      { key: 'test-key' }
    ];
    
    const result = await queryDatabase(queries);
    assert.equal(result, 'workspace-specific-value');
  });
  
  await t.test('should fallback through query hierarchy', async () => {
    const mockBackend = {
      async findAsset(query) {
        // Only respond to global key queries
        if (query.key === 'fallback-key' && !query.workspace && !query.language) {
          return 'global-fallback-value';
        }
        return null;
      }
    };
    
    setDbBackend(mockBackend);
    
    const queries = [
      { workspace: 'missing-ws', language: 'missing-lang', key: 'fallback-key' },
      { workspace: 'missing-ws', key: 'fallback-key' },
      { language: 'missing-lang', key: 'fallback-key' },
      { key: 'fallback-key' }
    ];
    
    const result = await queryDatabase(queries);
    assert.equal(result, 'global-fallback-value');
  });
  
  await t.test('should return null when no backend is set', async () => {
    setDbBackend(null);
    
    const queries = [{ key: 'any-key' }];
    const result = await queryDatabase(queries);
    
    assert.equal(result, null);
  });
  
  await t.test('should handle backend errors gracefully', async () => {
    const errorBackend = {
      async findAsset(query) {
        throw new Error('Database connection failed');
      }
    };
    
    setDbBackend(errorBackend);
    
    const queries = [{ key: 'error-key' }];
    const result = await queryDatabase(queries);
    
    assert.equal(result, null);
  });
  
  await t.test('should continue through queries on individual errors', async () => {
    const partialErrorBackend = {
      async findAsset(query) {
        if (query.workspace) {
          throw new Error('Workspace query failed');
        }
        if (query.key === 'partial-error-key') {
          return 'global-success';
        }
        return null;
      }
    };
    
    setDbBackend(partialErrorBackend);
    
    const queries = [
      { workspace: 'error-ws', key: 'partial-error-key' },
      { key: 'partial-error-key' }
    ];
    
    const result = await queryDatabase(queries);
    assert.equal(result, 'global-success');
  });
});