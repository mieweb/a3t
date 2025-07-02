/**
 * Framework compatibility tests for a3t
 * Tests basic compatibility with common Node.js frameworks
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const a3t = require('../src/index');

test('Framework Compatibility', async (t) => {
  const assetsPath = path.join(__dirname, '..', 'assets');
  
  await t.test('should work in Express-like environment', async () => {
    // Simulate Express middleware usage
    function createMiddleware() {
      return async (req, res, next) => {
        // Set context per request
        a3t.setContext({
          language: req.headers['accept-language']?.split(',')[0] || 'en',
          workspace: req.headers['x-workspace'] || 'default'
        });
        
        // Add a3t to request object for easy access
        req.a3t = a3t;
        next();
      };
    }
    
    const middleware = createMiddleware();
    
    // Mock Express request/response
    const req = {
      headers: {
        'accept-language': 'es,en;q=0.9',
        'x-workspace': 'test-workspace'
      }
    };
    const res = {};
    const next = () => {};
    
    // Initialize a3t
    a3t.init({ fs: { rootPath: assetsPath } });
    
    // Run middleware
    await middleware(req, res, next);
    
    // Test that context was set correctly
    const context = a3t.getContext();
    assert.equal(context.language, 'es');
    assert.equal(context.workspace, 'test-workspace');
    
    // Test asset retrieval through request object
    const asset = await req.a3t.get('prompts/summary.txt');
    assert.equal(typeof asset, 'string');
  });
  
  await t.test('should work in Fastify-like environment', async () => {
    // Simulate Fastify plugin
    function createPlugin() {
      return async function (fastify, options) {
        // Initialize a3t
        a3t.init({ 
          fs: { rootPath: assetsPath },
          context: options.defaultContext || {}
        });
        
        // Decorate Fastify instance
        fastify.decorate('a3t', a3t);
        
        // Add hook for per-request context
        fastify.addHook('preHandler', async (request, reply) => {
          if (request.headers['x-a3t-context']) {
            const contextOverride = JSON.parse(request.headers['x-a3t-context']);
            request.a3tContext = contextOverride;
          }
        });
      };
    }
    
    // Mock Fastify instance
    const fastify = {
      decorations: {},
      hooks: [],
      
      decorate(name, value) {
        this.decorations[name] = value;
      },
      
      addHook(name, handler) {
        this.hooks.push({ name, handler });
      }
    };
    
    const plugin = createPlugin();
    await plugin(fastify, { defaultContext: { system: 'fastify-app' } });
    
    // Test decoration
    assert.equal(typeof fastify.decorations.a3t, 'object');
    assert.equal(typeof fastify.decorations.a3t.get, 'function');
    
    // Test hook functionality
    const request = {
      headers: {
        'x-a3t-context': '{"language": "en", "workspace": "fastify-test"}'
      }
    };
    const reply = {};
    
    // Run preHandler hook
    const preHandler = fastify.hooks.find(h => h.name === 'preHandler');
    await preHandler.handler(request, reply);
    
    assert.deepEqual(request.a3tContext, { language: 'en', workspace: 'fastify-test' });
  });
  
  await t.test('should work in Meteor-like environment', async () => {
    // Mock Meteor globals
    const originalAssets = global.Assets;
    
    global.Assets = {
      getText(filePath) {
        // Simulate Meteor Assets.getText
        if (filePath === 'prompts/summary.txt') {
          return 'Meteor asset content';
        }
        throw new Error('Asset not found');
      },
      
      getBinary(filePath) {
        if (filePath === 'test.bin') {
          return Buffer.from('binary content');
        }
        throw new Error('Asset not found');
      }
    };
    
    try {
      // Initialize with Meteor backend
      a3t.init({
        fs: { meteor: true },
        context: { system: 'meteor-app' }
      });
      
      // Test Meteor asset loading
      const asset = await a3t.get('prompts/summary.txt');
      assert.equal(asset, 'Meteor asset content');
      
      const binary = await a3t.getBinary('test.bin');
      assert.equal(Buffer.isBuffer(binary), true);
      assert.equal(binary.toString(), 'binary content');
      
    } finally {
      // Restore original Assets
      if (originalAssets) {
        global.Assets = originalAssets;
      } else {
        delete global.Assets;
      }
    }
  });
  
  await t.test('should handle concurrent requests safely', async () => {
    a3t.init({ fs: { rootPath: assetsPath } });
    
    // Simulate multiple concurrent requests with different contexts
    const requests = [
      { language: 'en', workspace: 'ws1' },
      { language: 'es', workspace: 'ws2' },
      { language: 'en', workspace: 'ws3' },
      { language: 'es', workspace: 'ws1' }
    ];
    
    const promises = requests.map(async (context, index) => {
      // Each request uses context override to avoid interference
      const result = await a3t.get('prompts/summary.txt', undefined, context);
      return { index, context, result };
    });
    
    const results = await Promise.all(promises);
    
    // All requests should succeed
    results.forEach(({ result }) => {
      assert.equal(typeof result, 'string');
      assert.ok(result.length > 0);
    });
    
    // Results should be the same (since no DB overrides are set)
    const firstResult = results[0].result;
    results.forEach(({ result }) => {
      assert.equal(result, firstResult);
    });
  });
});