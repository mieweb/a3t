/**
 * Example demonstrating a3t Git integration with secret store
 */

const a3t = require('./src/index');

async function main() {
  console.log('🚀 a3t Git Integration Example\n');

  // Example 1: Basic Git backend setup
  console.log('1. Setting up Git backend...');
  a3t.init({
    fs: {
      git: {
        repoUrl: 'https://github.com/example/assets.git',
        branch: 'main',
        scope: 'workspace',
        cachePath: '.a3t-cache'
      }
    },
    context: {
      workspace: 'production',
      language: 'en'
    },
    logging: { enabled: true }
  });

  // Example 2: Using secret store for Git credentials
  console.log('\n2. Configuring Git credentials via secret store...');
  
  // Set up credentials (in real usage, these would come from environment variables)
  await a3t.secretStore.setSecret('git_token_https___github_com_example_assets_git', 'ghp_your_token_here');
  
  // Example 3: User-level Git caching
  console.log('\n3. Setting up user-level Git backend...');
  a3t.setGitFsBackend({
    repoUrl: 'https://github.com/user/personal-assets.git',
    branch: 'development',
    scope: 'user',
    credentials: {
      username: 'username',
      password: 'password' // Or use secret store
    }
  });

  // Example 4: Context-aware asset loading
  console.log('\n4. Context-aware asset loading...');
  
  // Set user context
  a3t.setContext({ 
    user: 'alice', 
    workspace: 'development',
    language: 'es' 
  });

  // Example API usage (these would work with actual repositories)
  console.log('\n5. Example API usage:');
  console.log('   const prompt = await a3t.get("prompts/welcome.txt", "Default welcome");');
  console.log('   const config = await a3t.get("config/app.json");');
  console.log('   const i18n = await a3t.__("i18n/messages.json", "{}");');
  
  // Example 6: Multiple asset loading
  console.log('\n6. Batch asset loading:');
  console.log('   const assets = await a3t.getMultiple([');
  console.log('     "prompts/summary.txt",');
  console.log('     "config/settings.json",');
  console.log('     "i18n/en.json"');
  console.log('   ]);');

  // Example 7: Secret store providers
  console.log('\n7. Secret store providers:');
  console.log('   Environment variables: A3T_GIT_TOKEN_REPO_NAME');
  console.log('   Memory store: a3t.secretStore.setSecret(key, value)');
  console.log('   Custom provider: a3t.secretStore.registerProvider(name, provider)');

  console.log('\n✅ Git integration ready! Assets will be cached per user/workspace context.');
  console.log('📁 Cache location: .a3t-git-cache/{scope}/{user|workspace}/{repo}');
  console.log('🔄 Auto-fetch: Updates every 5 minutes (configurable)');
  console.log('🔐 Credentials: Secure storage via secret store system');
}

// Only run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };