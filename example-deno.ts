/**
 * Deno example for a3t
 * Run with: deno run --allow-read --allow-net example-deno.ts
 */

import a3t from "./deno.ts";

// Example 1: Basic filesystem usage
console.log("=== Deno Filesystem Example ===");

a3t.init({
  fs: { rootPath: './assets' },
  context: { language: 'en', workspace: 'deno-example' },
  logging: { enabled: true }
});

try {
  // Get a text asset
  const prompt = await a3t.get('prompts/summary.txt', 'Default Deno prompt');
  console.log('Prompt:', prompt);
  
  // Get JSON config
  const config = await a3t.get('i18n/en.json', '{}');
  console.log('Config:', config);
  
  // Get binary asset
  const binary = await a3t.getBinary('test.bin');
  console.log('Binary length:', binary?.length || 'not found');
  
} catch (error) {
  console.error('Filesystem example error:', error);
}

// Example 2: HTTP backend usage
console.log("\n=== Deno HTTP Backend Example ===");

a3t.init({
  fs: { httpBaseUrl: 'https://raw.githubusercontent.com/mieweb/a3t/main/assets/' },
  context: { language: 'en', workspace: 'http-example' }
});

try {
  // This would work if the repository had the assets publicly available
  const httpAsset = await a3t.get('prompts/summary.txt', 'HTTP fallback');
  console.log('HTTP Asset:', httpAsset);
  
} catch (error) {
  console.error('HTTP example error:', error);
}

// Example 3: Multiple assets
console.log("\n=== Multiple Assets Example ===");

try {
  const assets = await a3t.getMultiple([
    'prompts/summary.txt',
    'i18n/en.json',
    'missing/file.txt'
  ], {
    'missing/file.txt': 'Default for missing file'
  });
  
  console.log('Multiple assets:', assets);
  
} catch (error) {
  console.error('Multiple assets error:', error);
}

// Example 4: Context override
console.log("\n=== Context Override Example ===");

try {
  const asset1 = await a3t.get('prompts/summary.txt', 'Default', { language: 'en' });
  const asset2 = await a3t.get('prompts/summary.txt', 'Default', { language: 'es' });
  
  console.log('English asset:', asset1);
  console.log('Spanish asset:', asset2);
  
} catch (error) {
  console.error('Context override error:', error);
}

console.log("\n=== Example Complete ===");