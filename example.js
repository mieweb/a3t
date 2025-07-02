/**
 * Example usage of a3t - Universal Asset Loader
 * This demonstrates the main features and use cases
 */

const a3t = require('./src/index');
const path = require('path');

async function main() {
  console.log('=== a3t Universal Asset Loader Demo ===\n');
  
  // Initialize a3t with filesystem backend
  const assetsPath = path.join(__dirname, 'assets');
  a3t.init({
    fs: { rootPath: assetsPath },
    context: {
      language: 'en',
      workspace: 'demo-workspace',
      system: 'demo-system'
    }
  });
  
  console.log('1. Basic asset retrieval:');
  
  // Get a text asset from filesystem
  const summary = await a3t.get('prompts/summary.txt');
  console.log('  Summary prompt:', summary);
  
  // Get JSON asset and parse it
  const i18nRaw = await a3t.get('i18n/en.json');
  const i18n = JSON.parse(i18nRaw);
  console.log('  English i18n welcome:', i18n.welcome);
  
  console.log('\n2. Using default values:');
  
  // Asset that doesn't exist - returns default
  const missing = await a3t.get('missing/config.json', '{"default": true}');
  console.log('  Missing config (with default):', missing);
  
  // Asset that doesn't exist without default - returns undefined
  const missingNoDefault = await a3t.get('missing/file.txt');
  console.log('  Missing file (no default):', missingNoDefault);
  
  console.log('\n3. Using __ alias for i18n-style:');
  
  const welcome = await a3t.__('i18n/en.json');
  const welcomeData = JSON.parse(welcome);
  console.log('  Welcome message (via __):', welcomeData.welcome);
  
  console.log('\n4. Context switching:');
  
  // Change language context
  a3t.setContext({ language: 'es', workspace: 'demo-workspace' });
  
  const spanishI18n = await a3t.get('i18n/es.json');
  const spanishData = JSON.parse(spanishI18n);
  console.log('  Spanish welcome:', spanishData.welcome);
  
  console.log('\n5. Context override per request:');
  
  // Override context just for this call
  const englishAgain = await a3t.get('i18n/en.json', undefined, { language: 'en' });
  const englishData = JSON.parse(englishAgain);
  console.log('  English via context override:', englishData.welcome);
  
  console.log('\n6. Multiple assets at once:');
  
  const multipleAssets = await a3t.getMultiple([
    'prompts/summary.txt',
    'i18n/en.json'
  ]);
  
  console.log('  Retrieved assets:', Object.keys(multipleAssets));
  
  console.log('\n7. Caching demonstration:');
  
  console.time('  First call (filesystem + cache)');
  await a3t.get('prompts/summary.txt');
  console.timeEnd('  First call (filesystem + cache)');
  
  console.time('  Second call (cache hit)');
  await a3t.get('prompts/summary.txt');
  console.timeEnd('  Second call (cache hit)');
  
  const stats = a3t.getCacheStats();
  console.log('  Cache size:', stats.size);
  
  console.log('\n8. Cache invalidation with nonce:');
  
  const oldNonce = a3t.getContext().nonce;
  console.log('  Current nonce:', oldNonce);
  
  const newNonce = a3t.incrementNonce();
  console.log('  New nonce after increment:', newNonce);
  console.log('  Cache size after nonce increment:', a3t.getCacheStats().size);
  
  console.log('\n9. Mock database backend demonstration:');
  
  // Set up a mock database backend
  const mockDb = {
    async findAsset(query) {
      // Simulate database overrides
      if (query.workspace === 'demo-workspace' && query.key === 'prompts/summary.txt') {
        return 'Custom workspace-specific summary prompt from database';
      }
      if (query.language === 'es' && query.key === 'i18n/welcome.txt') {
        return 'Hola desde la base de datos';
      }
      return null; // Not found in database
    }
  };
  
  a3t.setDbBackend(mockDb);
  
  // This should now return the database override
  const customSummary = await a3t.get('prompts/summary.txt');
  console.log('  Custom summary from DB:', customSummary);
  
  // This should fall back to filesystem since no DB override exists
  const regularFile = await a3t.get('i18n/en.json');
  console.log('  Regular file (no DB override):', JSON.parse(regularFile).welcome);
  
  console.log('\n=== Demo Complete ===');
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };