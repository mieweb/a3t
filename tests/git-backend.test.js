/**
 * Tests for a3t Git backend
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs').promises;
const path = require('path');
const { simpleGit } = require('simple-git');
const { GitFsBackend } = require('../src/git-backend');
const { setSecret, clearMemorySecrets } = require('../src/secret-store');
const { setA3tContext } = require('../src/context');

// Test helper to create a temporary Git repository
async function createTestRepo() {
  const tempDir = path.join('/tmp', `a3t-test-repo-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });
  
  // Initialize git repo
  const git = simpleGit(tempDir);
  await git.init();
  await git.addConfig('user.name', 'Test User');
  await git.addConfig('user.email', 'test@example.com');
  
  // Create some test assets
  await fs.mkdir(path.join(tempDir, 'prompts'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'i18n'), { recursive: true });
  
  await fs.writeFile(
    path.join(tempDir, 'prompts', 'test.txt'),
    'This is a test prompt from Git'
  );
  
  await fs.writeFile(
    path.join(tempDir, 'i18n', 'en.json'),
    JSON.stringify({ greeting: 'Hello from Git!' }, null, 2)
  );
  
  await fs.writeFile(
    path.join(tempDir, 'test.bin'),
    Buffer.from([1, 2, 3, 4, 5])
  );
  
  // Add and commit files
  await git.add('.');
  await git.commit('Initial commit with test assets');
  
  // Get the actual default branch name
  const status = await git.status();
  const defaultBranch = status.current || 'master';
  
  return { path: tempDir, defaultBranch };
}

async function cleanupTestRepo(repoPath) {
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function cleanupGitCache() {
  try {
    await fs.rm('.a3t-git-cache', { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

test('GitFsBackend', async (t) => {
  let testRepo;
  
  t.beforeEach(async () => {
    clearMemorySecrets();
    setA3tContext({ workspace: 'test-workspace', user: 'test-user' });
    await cleanupGitCache();
  });
  
  t.afterEach(async () => {
    if (testRepo) {
      await cleanupTestRepo(testRepo.path);
      testRepo = null;
    }
    await cleanupGitCache();
  });

  await t.test('should throw error without repoUrl', () => {
    assert.throws(
      () => new GitFsBackend({}),
      /GitFsBackend requires repoUrl/
    );
  });

  await t.test('should create instance with valid config', () => {
    const backend = new GitFsBackend({
      repoUrl: 'https://github.com/test/repo.git'
    });
    
    assert.equal(backend.config.repoUrl, 'https://github.com/test/repo.git');
    assert.equal(backend.config.branch, 'main');
    assert.equal(backend.config.scope, 'workspace');
    assert.equal(backend.config.autoFetch, true);
  });

  await t.test('should handle custom configuration', () => {
    const backend = new GitFsBackend({
      repoUrl: 'https://github.com/test/repo.git',
      branch: 'develop',
      scope: 'user',
      cachePath: '/custom/cache',
      autoFetch: false,
      fetchInterval: 600000
    });
    
    assert.equal(backend.config.branch, 'develop');
    assert.equal(backend.config.scope, 'user');
    assert.equal(backend.config.cachePath, '/custom/cache');
    assert.equal(backend.config.autoFetch, false);
    assert.equal(backend.config.fetchInterval, 600000);
  });

  await t.test('should generate different paths for different scopes', () => {
    const workspaceBackend = new GitFsBackend({
      repoUrl: 'https://github.com/test/repo.git',
      scope: 'workspace'
    });
    
    const userBackend = new GitFsBackend({
      repoUrl: 'https://github.com/test/repo.git',
      scope: 'user'
    });
    
    const workspacePath = workspaceBackend.getLocalRepoPath();
    const userPath = userBackend.getLocalRepoPath();
    
    assert.notEqual(workspacePath, userPath);
    assert.ok(workspacePath.includes('workspace'));
    assert.ok(userPath.includes('user'));
    assert.ok(workspacePath.includes('test-workspace'));
    assert.ok(userPath.includes('test-user'));
  });

  await t.test('should work with local file:// URLs', async () => {
    testRepo = await createTestRepo();
    
    const backend = new GitFsBackend({
      repoUrl: `file://${testRepo.path}`,
      branch: testRepo.defaultBranch,
      autoFetch: false // Don't auto-fetch for local repos in tests
    });
    
    // Should be able to read assets
    const prompt = await backend.readAsset('prompts/test.txt');
    assert.equal(prompt, 'This is a test prompt from Git');
    
    const i18n = await backend.readAsset('i18n/en.json');
    const parsed = JSON.parse(i18n);
    assert.equal(parsed.greeting, 'Hello from Git!');
    
    const binary = await backend.readBinaryAsset('test.bin');
    assert.ok(Buffer.isBuffer(binary));
    assert.deepEqual(Array.from(binary), [1, 2, 3, 4, 5]);
  });

  await t.test('should return null for non-existent files', async () => {
    testRepo = await createTestRepo();
    
    const backend = new GitFsBackend({
      repoUrl: `file://${testRepo.path}`,
      branch: testRepo.defaultBranch,
      autoFetch: false
    });
    
    const missing = await backend.readAsset('missing/file.txt');
    assert.equal(missing, null);
    
    const missingBinary = await backend.readBinaryAsset('missing/file.bin');
    assert.equal(missingBinary, null);
  });

  await t.test('should prevent path traversal', async () => {
    testRepo = await createTestRepo();
    
    const backend = new GitFsBackend({
      repoUrl: `file://${testRepo.path}`,
      branch: testRepo.defaultBranch,
      autoFetch: false
    });
    
    const result1 = await backend.readAsset('../../../etc/passwd');
    const result2 = await backend.readAsset('../../package.json');
    
    assert.equal(result1, null);
    assert.equal(result2, null);
  });

  await t.test('should handle authentication from secret store', async () => {
    const backend = new GitFsBackend({
      repoUrl: 'https://github.com/test/repo.git'
    });
    
    // Set credentials in secret store
    await setSecret('git_username_https___github_com_test_repo_git', 'testuser');
    await setSecret('git_password_https___github_com_test_repo_git', 'testpass');
    
    const auth = await backend.getAuthOptions();
    assert.equal(auth.username, 'testuser');
    assert.equal(auth.password, 'testpass');
  });

  await t.test('should handle authentication from config', async () => {
    const backend = new GitFsBackend({
      repoUrl: 'https://github.com/test/repo.git',
      credentials: {
        username: 'configuser',
        password: 'configpass'
      }
    });
    
    const auth = await backend.getAuthOptions();
    assert.equal(auth.username, 'configuser');
    assert.equal(auth.password, 'configpass');
  });

  await t.test('should prioritize secret store over config', async () => {
    const backend = new GitFsBackend({
      repoUrl: 'https://github.com/test/repo.git',
      credentials: {
        username: 'configuser',
        password: 'configpass'
      }
    });
    
    // Set credentials in secret store (should override config)
    await setSecret('git_username_https___github_com_test_repo_git', 'secretuser');
    await setSecret('git_password_https___github_com_test_repo_git', 'secretpass');
    
    const auth = await backend.getAuthOptions();
    assert.equal(auth.username, 'secretuser');
    assert.equal(auth.password, 'secretpass');
  });

  await t.test('should get repository info', async () => {
    testRepo = await createTestRepo();
    
    const backend = new GitFsBackend({
      repoUrl: `file://${testRepo.path}`,
      branch: testRepo.defaultBranch,
      autoFetch: false
    });
    
    // Before cloning - should show invalid
    let info = await backend.getRepoInfo();
    assert.equal(info.valid, false);
    assert.equal(info.exists, false);
    
    // After reading an asset (which triggers clone)
    await backend.readAsset('prompts/test.txt');
    
    info = await backend.getRepoInfo();
    assert.equal(info.valid, true);
    assert.equal(info.exists, true);
    assert.ok(info.path);
    assert.ok(info.branch);
    assert.ok(info.lastCommit);
  });

  await t.test('should force refresh repository', async () => {
    testRepo = await createTestRepo();
    
    const backend = new GitFsBackend({
      repoUrl: `file://${testRepo.path}`,
      branch: testRepo.defaultBranch,
      autoFetch: false
    });
    
    // Read asset to trigger initial clone
    await backend.readAsset('prompts/test.txt');
    
    let info = await backend.getRepoInfo();
    assert.equal(info.valid, true);
    
    // Force refresh should work
    await backend.forceRefresh();
    
    info = await backend.getRepoInfo();
    assert.equal(info.valid, true);
  });

  await t.test('should handle different context for user scope', async () => {
    testRepo = await createTestRepo();
    
    const backend = new GitFsBackend({
      repoUrl: `file://${testRepo.path}`,
      branch: testRepo.defaultBranch,
      scope: 'user',
      autoFetch: false
    });
    
    // Test with user1
    setA3tContext({ user: 'user1' });
    const path1 = backend.getLocalRepoPath();
    await backend.readAsset('prompts/test.txt');
    
    // Test with user2
    setA3tContext({ user: 'user2' });
    const path2 = backend.getLocalRepoPath();
    await backend.readAsset('prompts/test.txt');
    
    // Should have different cache paths
    assert.notEqual(path1, path2);
    assert.ok(path1.includes('user1'));
    assert.ok(path2.includes('user2'));
  });
});