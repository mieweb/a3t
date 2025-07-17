/**
 * Tests for a3t secret store
 */

const test = require('node:test');
const assert = require('node:assert');

const {
  SecretProvider,
  EnvironmentProvider,
  MemoryProvider,
  CompositeProvider,
  registerProvider,
  getProvider,
  setDefaultProvider,
  getSecret,
  setSecret,
  clearMemorySecrets,
} = require('../src/secret-store');

test('SecretStore', async (t) => {
  
  await t.test('should have SecretProvider base class', () => {
    const provider = new SecretProvider();
    assert.ok(provider instanceof SecretProvider);
  });
  
  await t.test('SecretProvider should throw on unimplemented methods', async () => {
    const provider = new SecretProvider();
    
    await assert.rejects(
      () => provider.getSecret('test'),
      /getSecret method must be implemented/
    );
    
    await assert.rejects(
      () => provider.setSecret('test', 'value'),
      /setSecret method not supported/
    );
  });

  await t.test('EnvironmentProvider should work', async () => {
    const provider = new EnvironmentProvider();
    
    // Set an environment variable
    process.env.A3T_TEST_SECRET = 'test-value';
    
    const value = await provider.getSecret('test_secret');
    assert.equal(value, 'test-value');
    
    const missing = await provider.getSecret('missing_secret');
    assert.equal(missing, null);
    
    // Clean up
    delete process.env.A3T_TEST_SECRET;
  });

  await t.test('EnvironmentProvider should handle custom prefix', async () => {
    const provider = new EnvironmentProvider('CUSTOM_');
    
    // Set an environment variable
    process.env.CUSTOM_TEST_SECRET = 'custom-value';
    
    const value = await provider.getSecret('test_secret');
    assert.equal(value, 'custom-value');
    
    // Clean up
    delete process.env.CUSTOM_TEST_SECRET;
  });

  await t.test('MemoryProvider should work', async () => {
    const provider = new MemoryProvider();
    
    // Initially should be empty
    const missing = await provider.getSecret('test');
    assert.equal(missing, null);
    
    // Set a secret
    await provider.setSecret('test', 'value');
    
    // Should retrieve the value
    const value = await provider.getSecret('test');
    assert.equal(value, 'value');
    
    // Clear should work
    provider.clear();
    const cleared = await provider.getSecret('test');
    assert.equal(cleared, null);
  });

  await t.test('CompositeProvider should try providers in order', async () => {
    const memory1 = new MemoryProvider();
    const memory2 = new MemoryProvider();
    
    await memory1.setSecret('key1', 'from-memory1');
    await memory2.setSecret('key1', 'from-memory2');
    await memory2.setSecret('key2', 'from-memory2');
    
    const composite = new CompositeProvider([memory1, memory2]);
    
    // Should get from first provider
    const value1 = await composite.getSecret('key1');
    assert.equal(value1, 'from-memory1');
    
    // Should get from second provider when not in first
    const value2 = await composite.getSecret('key2');
    assert.equal(value2, 'from-memory2');
    
    // Should return null when not found
    const missing = await composite.getSecret('missing');
    assert.equal(missing, null);
  });

  await t.test('should register and get providers', () => {
    const customProvider = new MemoryProvider();
    
    registerProvider('custom', customProvider);
    
    const retrieved = getProvider('custom');
    assert.equal(retrieved, customProvider);
    
    const missing = getProvider('nonexistent');
    assert.equal(missing, null);
  });

  await t.test('should set default provider by name', async () => {
    const customProvider = new MemoryProvider();
    await customProvider.setSecret('test', 'custom-value');
    
    registerProvider('custom-test', customProvider);
    setDefaultProvider('custom-test');
    
    const value = await getSecret('test');
    assert.equal(value, 'custom-value');
  });

  await t.test('should set default provider by instance', async () => {
    const customProvider = new MemoryProvider();
    await customProvider.setSecret('test', 'instance-value');
    
    setDefaultProvider(customProvider);
    
    const value = await getSecret('test');
    assert.equal(value, 'instance-value');
  });

  await t.test('should work with default environment + memory composite', async () => {
    // Reset to default providers
    clearMemorySecrets();
    
    // Create and set composite provider explicitly
    const envProvider = new EnvironmentProvider();
    const memoryProvider = new MemoryProvider();
    const compositeProvider = new CompositeProvider([envProvider, memoryProvider]);
    setDefaultProvider(compositeProvider);
    
    // Test environment variable
    process.env.A3T_ENV_TEST = 'env-value';
    
    const envValue = await getSecret('env_test');
    assert.equal(envValue, 'env-value');
    
    // Test memory fallback
    const success = await setSecret('memory_test', 'memory-value');
    assert.equal(success, true);
    
    const memoryValue = await getSecret('memory_test');
    assert.equal(memoryValue, 'memory-value');
    
    // Test missing
    const missing = await getSecret('definitely_missing');
    assert.equal(missing, null);
    
    // Clean up
    delete process.env.A3T_ENV_TEST;
    clearMemorySecrets();
  });

  await t.test('should handle provider errors gracefully', async () => {
    class ErrorProvider extends SecretProvider {
      async getSecret() {
        throw new Error('Provider error');
      }
    }
    
    const errorProvider = new ErrorProvider();
    const memoryProvider = new MemoryProvider();
    await memoryProvider.setSecret('test', 'fallback-value');
    
    const composite = new CompositeProvider([errorProvider, memoryProvider]);
    setDefaultProvider(composite);
    
    // Should fallback to working provider
    const value = await getSecret('test');
    assert.equal(value, 'fallback-value');
  });

  await t.test('should throw error for invalid provider registration', () => {
    assert.throws(
      () => registerProvider('invalid', {}),
      /Provider must extend SecretProvider class/
    );
  });

  await t.test('should throw error for invalid default provider', () => {
    assert.throws(
      () => setDefaultProvider('nonexistent'),
      /Provider 'nonexistent' not found/
    );
    
    assert.throws(
      () => setDefaultProvider({}),
      /Provider must be a string name or SecretProvider instance/
    );
  });

  await t.test('setSecret should return false on unsupported providers', async () => {
    const envProvider = new EnvironmentProvider();
    setDefaultProvider(envProvider);
    
    const success = await setSecret('test', 'value');
    assert.equal(success, false);
  });
});