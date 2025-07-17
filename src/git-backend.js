/**
 * Git filesystem backend for a3t
 * Supports cloning and fetching assets from remote Git repositories
 */

const fs = require('fs').promises;
const path = require('path');
const { simpleGit } = require('simple-git');
const { getSecret } = require('./secret-store');
const { logBackend } = require('./logging');
const { getA3tContext } = require('./context');

/**
 * Git-based filesystem backend
 */
class GitFsBackend {
  constructor(config = {}) {
    this.config = {
      repoUrl: config.repoUrl,
      branch: config.branch || 'main',
      tag: config.tag,
      commit: config.commit,
      cachePath: config.cachePath || '.a3t-git-cache',
      scope: config.scope || 'workspace', // 'workspace' or 'user'
      credentials: config.credentials || {},
      autoFetch: config.autoFetch !== false, // Default to true
      fetchInterval: config.fetchInterval || 300000, // 5 minutes default
      ...config
    };
    
    this.lastFetch = new Map();
    this.repositories = new Map();
    
    if (!this.config.repoUrl) {
      throw new Error('GitFsBackend requires repoUrl');
    }
  }
  
  /**
   * Get the local repository path for current context
   */
  getLocalRepoPath() {
    const context = getA3tContext();
    const scopeId = this.config.scope === 'user' 
      ? (context.user || 'default-user')
      : (context.workspace || 'default-workspace');
    
    // Create a safe directory name from repo URL
    const repoName = this.config.repoUrl
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    return path.join(this.config.cachePath, this.config.scope, scopeId, repoName);
  }
  
  /**
   * Get Git authentication options
   */
  async getAuthOptions() {
    const auth = {};
    
    // Check for username/password in credentials config
    if (this.config.credentials.username) {
      auth.username = this.config.credentials.username;
    }
    if (this.config.credentials.password) {
      auth.password = this.config.credentials.password;
    }
    if (this.config.credentials.token) {
      auth.token = this.config.credentials.token;
    }
    
    // Check for credentials in secret store
    const repoKey = this.config.repoUrl.replace(/[^a-zA-Z0-9]/g, '_');
    
    const secretUsername = await getSecret(`git_username_${repoKey}`);
    if (secretUsername) {
      auth.username = secretUsername;
    }
    
    const secretPassword = await getSecret(`git_password_${repoKey}`);
    if (secretPassword) {
      auth.password = secretPassword;
    }
    
    const secretToken = await getSecret(`git_token_${repoKey}`);
    if (secretToken) {
      auth.token = secretToken;
    }
    
    return auth;
  }
  
  /**
   * Get or create Git instance for the repository
   */
  async getGitInstance() {
    const repoPath = this.getLocalRepoPath();
    
    if (!this.repositories.has(repoPath)) {
      const git = simpleGit();
      this.repositories.set(repoPath, git);
    }
    
    return this.repositories.get(repoPath);
  }
  
  /**
   * Check if local repository exists and is valid
   */
  async isRepoValid(repoPath) {
    try {
      await fs.access(path.join(repoPath, '.git'));
      const git = simpleGit(repoPath);
      await git.status();
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Clone or fetch the repository
   */
  async ensureRepository() {
    const repoPath = this.getLocalRepoPath();
    const now = Date.now();
    const lastFetchTime = this.lastFetch.get(repoPath) || 0;
    
    // Check if we need to fetch based on interval
    if (this.config.autoFetch && (now - lastFetchTime) < this.config.fetchInterval) {
      // Still within fetch interval, skip if repo exists
      if (await this.isRepoValid(repoPath)) {
        return repoPath;
      }
    }
    
    try {
      // Ensure cache directory exists
      await fs.mkdir(path.dirname(repoPath), { recursive: true });
      
      const auth = await this.getAuthOptions();
      const git = simpleGit();
      
      if (!(await this.isRepoValid(repoPath))) {
        // Repository doesn't exist or is invalid, clone it
        logBackend('git', 'clone', this.config.repoUrl, 'starting');
        
        const cloneOptions = [];
        
        // Add authentication if available
        let repoUrlWithAuth = this.config.repoUrl;
        if (auth.username && auth.password) {
          const url = new URL(this.config.repoUrl);
          url.username = auth.username;
          url.password = auth.password;
          repoUrlWithAuth = url.toString();
        } else if (auth.token) {
          const url = new URL(this.config.repoUrl);
          url.username = auth.token;
          url.password = 'x-oauth-basic';
          repoUrlWithAuth = url.toString();
        }
        
        await git.clone(repoUrlWithAuth, repoPath, cloneOptions);
        logBackend('git', 'clone', this.config.repoUrl, true);
      } else {
        // Repository exists, fetch updates
        logBackend('git', 'fetch', this.config.repoUrl, 'starting');
        
        const repoGit = simpleGit(repoPath);
        await repoGit.fetch();
        logBackend('git', 'fetch', this.config.repoUrl, true);
      }
      
      // Checkout specific branch, tag, or commit
      const repoGit = simpleGit(repoPath);
      
      if (this.config.commit) {
        await repoGit.checkout(this.config.commit);
        logBackend('git', 'checkout', this.config.commit, true);
      } else if (this.config.tag) {
        await repoGit.checkout(`tags/${this.config.tag}`);
        logBackend('git', 'checkout', `tags/${this.config.tag}`, true);
      } else {
        await repoGit.checkout(this.config.branch);
        logBackend('git', 'checkout', this.config.branch, true);
      }
      
      this.lastFetch.set(repoPath, now);
      return repoPath;
      
    } catch (error) {
      logBackend('git', 'ensureRepository', this.config.repoUrl, false, error);
      throw new Error(`Failed to ensure Git repository: ${error.message}`);
    }
  }
  
  async readAsset(key) {
    try {
      const repoPath = await this.ensureRepository();
      const assetPath = path.join(repoPath, key);
      
      // Security check: ensure the resolved path is within the repository
      const resolvedPath = path.resolve(assetPath);
      const resolvedRepo = path.resolve(repoPath);
      
      if (!resolvedPath.startsWith(resolvedRepo + path.sep) && resolvedPath !== resolvedRepo) {
        throw new Error('Path traversal not allowed');
      }
      
      const content = await fs.readFile(assetPath, 'utf8');
      logBackend('git', 'readAsset', key, true);
      return content;
      
    } catch (error) {
      const success = false;
      if (error.code === 'ENOENT') {
        logBackend('git', 'readAsset', key, success);
        return null; // File not found
      }
      logBackend('git', 'readAsset', key, success, error);
      return null;
    }
  }
  
  async readBinaryAsset(key) {
    try {
      const repoPath = await this.ensureRepository();
      const assetPath = path.join(repoPath, key);
      
      // Security check: ensure the resolved path is within the repository
      const resolvedPath = path.resolve(assetPath);
      const resolvedRepo = path.resolve(repoPath);
      
      if (!resolvedPath.startsWith(resolvedRepo + path.sep) && resolvedPath !== resolvedRepo) {
        throw new Error('Path traversal not allowed');
      }
      
      const buffer = await fs.readFile(assetPath);
      logBackend('git', 'readBinaryAsset', key, true);
      return buffer;
      
    } catch (error) {
      const success = false;
      if (error.code === 'ENOENT') {
        logBackend('git', 'readBinaryAsset', key, success);
        return null; // File not found
      }
      logBackend('git', 'readBinaryAsset', key, success, error);
      return null;
    }
  }
  
  /**
   * Force refresh the repository (useful for testing or manual updates)
   */
  async forceRefresh() {
    const repoPath = this.getLocalRepoPath();
    this.lastFetch.delete(repoPath);
    
    try {
      // Remove the repository directory to force a fresh clone
      await fs.rm(repoPath, { recursive: true, force: true });
      logBackend('git', 'forceRefresh', this.config.repoUrl, true);
    } catch (error) {
      logBackend('git', 'forceRefresh', this.config.repoUrl, false, error);
    }
    
    return await this.ensureRepository();
  }
  
  /**
   * Get repository status and information
   */
  async getRepoInfo() {
    try {
      const repoPath = this.getLocalRepoPath();
      
      if (!(await this.isRepoValid(repoPath))) {
        return {
          valid: false,
          exists: false,
          path: repoPath
        };
      }
      
      const git = simpleGit(repoPath);
      const status = await git.status();
      const log = await git.log({ maxCount: 1 });
      
      return {
        valid: true,
        exists: true,
        path: repoPath,
        branch: status.current,
        ahead: status.ahead,
        behind: status.behind,
        modified: status.files.length > 0,
        lastCommit: log.latest,
        lastFetch: this.lastFetch.get(repoPath)
      };
      
    } catch (error) {
      logBackend('git', 'getRepoInfo', this.config.repoUrl, false, error);
      return {
        valid: false,
        exists: false,
        path: this.getLocalRepoPath(),
        error: error.message
      };
    }
  }
}

module.exports = {
  GitFsBackend,
};