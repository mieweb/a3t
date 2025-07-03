/**
 * Deno tests for a3t
 * Run with: deno test --allow-read test-deno.ts
 */

import { assertEquals, assertNotEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import a3t, { DenoFsBackend, HttpBackend } from "./deno.ts";

Deno.test("a3t Deno - Basic functionality", async () => {
  a3t.init({
    fs: { rootPath: './assets' },
    context: { language: 'en', workspace: 'test' },
    logging: { enabled: false } // Disable logging for cleaner test output
  });
  
  // Test getting an asset
  const asset = await a3t.get('prompts/summary.txt', 'Default prompt');
  assertNotEquals(asset, undefined);
  
  // Test default value
  const missing = await a3t.get('missing/file.txt', 'Default value');
  assertEquals(missing, 'Default value');
  
  // Test undefined for missing without default
  const notFound = await a3t.get('definitely/missing.txt');
  assertEquals(notFound, undefined);
});

Deno.test("a3t Deno - Context management", async () => {
  a3t.setContext({ language: 'es', workspace: 'test2' });
  
  const context = a3t.getContext();
  assertEquals(context.language, 'es');
  assertEquals(context.workspace, 'test2');
});

Deno.test("a3t Deno - Cache functionality", async () => {
  a3t.init({
    fs: { rootPath: './assets' },
    logging: { enabled: false }
  });
  
  // Clear cache first
  a3t.clearCache();
  
  // First call should hit filesystem
  const result1 = await a3t.get('prompts/summary.txt', 'Default');
  
  // Second call should be cached (would be same result)
  const result2 = await a3t.get('prompts/summary.txt', 'Default');
  
  assertEquals(result1, result2);
});

Deno.test("a3t Deno - Multiple assets", async () => {
  a3t.init({
    fs: { rootPath: './assets' },
    logging: { enabled: false }
  });
  
  const results = await a3t.getMultiple([
    'prompts/summary.txt',
    'missing/file.txt'
  ], {
    'missing/file.txt': 'Default for missing'
  });
  
  assertNotEquals(results['prompts/summary.txt'], undefined);
  assertEquals(results['missing/file.txt'], 'Default for missing');
});

Deno.test("a3t Deno - Binary assets", async () => {
  a3t.init({
    fs: { rootPath: './assets' },
    logging: { enabled: false }
  });
  
  const binary = await a3t.getBinary('test.bin');
  
  // Should return Uint8Array or null for missing file
  if (binary !== null) {
    assertEquals(binary instanceof Uint8Array, true);
  }
});

Deno.test("a3t Deno - DenoFsBackend", async () => {
  const backend = new DenoFsBackend('./assets');
  
  // Test reading existing file
  const content = await backend.readAsset('prompts/summary.txt');
  
  if (content !== null) {
    assertNotEquals(content.length, 0);
  }
  
  // Test reading non-existent file
  const missing = await backend.readAsset('missing/file.txt');
  assertEquals(missing, null);
});

Deno.test("a3t Deno - Nonce increment", async () => {
  const initialNonce = a3t.getContext().nonce;
  const newNonce = a3t.incrementNonce();
  
  assertEquals(newNonce, (initialNonce || 1) + 1);
  assertEquals(a3t.getContext().nonce, newNonce);
});