/**
 * Filesystem backend for a3t
 * Supports Node.js fs/promises and Meteor Assets API
 */

const fs = require('fs').promises;
const path = require('path');
const { logBackend } = require('./logging');

let fsBackend = null;
let assetsRootPath = 'assets';

/**
 * Default Node.js filesystem backend
 */
class NodeFsBackend {
  constructor(rootPath = 'assets') {
    this.rootPath = rootPath;
  }
  
  async readAsset(key) {
    try {
      const fullPath = path.join(this.rootPath, key);
      
      // Security check: ensure the resolved path is within the root directory
      const resolvedPath = path.resolve(fullPath);
      const resolvedRoot = path.resolve(this.rootPath);
      
      if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
        throw new Error('Path traversal not allowed');
      }
      
      const content = await fs.readFile(fullPath, 'utf8');
      logBackend('node-fs', 'readAsset', key, true);
      return content;
    } catch (error) {
      const success = false;
      if (error.code === 'ENOENT') {
        logBackend('node-fs', 'readAsset', key, success);
        return null; // File not found
      }
      logBackend('node-fs', 'readAsset', key, success, error);
      return null;
    }
  }
  
  async readBinaryAsset(key) {
    try {
      const fullPath = path.join(this.rootPath, key);
      
      // Security check: ensure the resolved path is within the root directory
      const resolvedPath = path.resolve(fullPath);
      const resolvedRoot = path.resolve(this.rootPath);
      
      if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
        throw new Error('Path traversal not allowed');
      }
      
      const buffer = await fs.readFile(fullPath);
      logBackend('node-fs', 'readBinaryAsset', key, true);
      return buffer;
    } catch (error) {
      const success = false;
      if (error.code === 'ENOENT') {
        logBackend('node-fs', 'readBinaryAsset', key, success);
        return null; // File not found
      }
      logBackend('node-fs', 'readBinaryAsset', key, success, error);
      return null;
    }
  }
}

/**
 * Meteor Assets backend
 */
class MeteorAssetsBackend {
  async readAsset(key) {
    try {
      // Check if we're in Meteor environment
      if (typeof Assets === 'undefined') {
        return null;
      }
      
      const content = Assets.getText(key);
      logBackend('meteor-assets', 'readAsset', key, true);
      return content;
    } catch (error) {
      logBackend('meteor-assets', 'readAsset', key, false, error);
      return null; // Asset not found or error
    }
  }
  
  async readBinaryAsset(key) {
    try {
      // Check if we're in Meteor environment
      if (typeof Assets === 'undefined') {
        return null;
      }
      
      const buffer = Assets.getBinary(key);
      logBackend('meteor-assets', 'readBinaryAsset', key, true);
      return buffer;
    } catch (error) {
      logBackend('meteor-assets', 'readBinaryAsset', key, false, error);
      return null; // Asset not found or error
    }
  }
}

/**
 * Set custom filesystem backend
 * @param {Object} backend - Filesystem backend with readAsset(key) and readBinaryAsset(key) methods
 */
function setFsBackend(backend) {
  fsBackend = backend;
}

/**
 * Set Node.js filesystem backend with custom root path
 * @param {string} rootPath - Root path for assets (default: 'assets')
 */
function setNodeFsBackend(rootPath = 'assets') {
  assetsRootPath = rootPath;
  fsBackend = new NodeFsBackend(rootPath);
}

/**
 * Set Meteor Assets backend
 */
function setMeteorAssetsBackend() {
  fsBackend = new MeteorAssetsBackend();
}

/**
 * Auto-detect and set appropriate filesystem backend
 */
function autoDetectFsBackend() {
  if (typeof Assets !== 'undefined') {
    // Meteor environment detected
    setMeteorAssetsBackend();
  } else {
    // Node.js environment
    setNodeFsBackend();
  }
}

/**
 * Read asset from filesystem
 * @param {string} key - Asset key (file path)
 * @param {boolean} binary - Whether to read as binary (default: false for text)
 * @returns {Promise<string|Buffer|null>} Asset content or null if not found
 */
async function readFromFilesystem(key, binary = false) {
  if (!fsBackend) {
    autoDetectFsBackend();
  }
  
  try {
    if (binary) {
      return await fsBackend.readBinaryAsset(key);
    } else {
      return await fsBackend.readAsset(key);
    }
  } catch (error) {
    console.warn('a3t: Filesystem backend error:', error.message);
    return null;
  }
}

/**
 * Get current filesystem backend
 * @returns {Object|null} Current filesystem backend
 */
function getFsBackend() {
  return fsBackend;
}

module.exports = {
  NodeFsBackend,
  MeteorAssetsBackend,
  setFsBackend,
  setNodeFsBackend,
  setMeteorAssetsBackend,
  autoDetectFsBackend,
  readFromFilesystem,
  getFsBackend,
};