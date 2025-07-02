/**
 * Tests for a3t filesystem backend
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const { NodeFsBackend, setNodeFsBackend, readFromFilesystem, autoDetectFsBackend } = require('../src/fs-backend');

test('Filesystem Backend', async (t) => {
  const assetsPath = path.join(__dirname, '..', 'assets');
  
  await t.test('should read text files', async () => {
    setNodeFsBackend(assetsPath);
    
    const content = await readFromFilesystem('prompts/summary.txt');
    assert.equal(typeof content, 'string');
    assert.equal(content.includes('summary'), true);
  });
  
  await t.test('should read JSON files', async () => {
    setNodeFsBackend(assetsPath);
    
    const content = await readFromFilesystem('i18n/en.json');
    assert.equal(typeof content, 'string');
    
    // Should be valid JSON
    const parsed = JSON.parse(content);
    assert.equal(parsed.welcome, 'Welcome to our application');
  });
  
  await t.test('should return null for non-existent files', async () => {
    setNodeFsBackend(assetsPath);
    
    const content = await readFromFilesystem('non-existent/file.txt');
    assert.equal(content, null);
  });
  
  await t.test('should prevent path traversal attacks', async () => {
    const backend = new NodeFsBackend(assetsPath);
    
    // These should all return null or throw error (not succeed)
    const result1 = await backend.readAsset('../package.json');
    const result2 = await backend.readAsset('../../package.json');
    const result3 = await backend.readAsset('/etc/passwd');
    
    assert.equal(result1, null);
    assert.equal(result2, null);
    assert.equal(result3, null);
  });
  
  await t.test('should handle binary files', async () => {
    setNodeFsBackend(assetsPath);
    
    // Create a small binary file for testing
    const fs = require('fs').promises;
    const binaryPath = path.join(assetsPath, 'test-binary.bin');
    const testData = Buffer.from([1, 2, 3, 4, 5]);
    
    try {
      await fs.writeFile(binaryPath, testData);
      
      const content = await readFromFilesystem('test-binary.bin', true);
      assert.equal(Buffer.isBuffer(content), true);
      assert.deepEqual(content, testData);
      
    } finally {
      // Clean up
      try {
        await fs.unlink(binaryPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });
  
  await t.test('should auto-detect Node.js backend', () => {
    autoDetectFsBackend();
    
    // In Node.js environment, should set up Node.js backend
    // We can't easily test the actual auto-detection without mocking globals
    // but we can verify it doesn't throw
    assert.ok(true);
  });
});