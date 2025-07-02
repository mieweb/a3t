/**
 * Database backend for a3t
 * Default implementation uses MongoDB, but can be replaced with custom backend
 */

let dbBackend = null;
let mongoClient = null;

/**
 * Default MongoDB backend implementation
 */
class MongoDbBackend {
  constructor(client, databaseName = 'a3t', collectionName = 'assets') {
    this.client = client;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
  }
  
  async findAsset(query) {
    try {
      const db = this.client.db(this.databaseName);
      const collection = db.collection(this.collectionName);
      const result = await collection.findOne(query);
      return result ? result.value : null;
    } catch (error) {
      console.warn('a3t: Database query failed:', error.message);
      return null;
    }
  }
  
  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}

/**
 * Set the database backend
 * @param {Object} backend - Database backend implementation with findAsset(query) method
 */
function setDbBackend(backend) {
  dbBackend = backend;
}

/**
 * Set up MongoDB backend with connection
 * @param {Object} client - MongoDB client instance
 * @param {string} databaseName - Database name (default: 'a3t')
 * @param {string} collectionName - Collection name (default: 'assets')
 */
function setMongoDbBackend(client, databaseName, collectionName) {
  mongoClient = client;
  dbBackend = new MongoDbBackend(client, databaseName, collectionName);
}

/**
 * Query database for asset using hierarchy
 * @param {Array} queries - Array of query objects in order of priority
 * @returns {Promise<any|null>} Asset value or null if not found
 */
async function queryDatabase(queries) {
  if (!dbBackend) {
    return null;
  }
  
  for (const query of queries) {
    try {
      const result = await dbBackend.findAsset(query);
      if (result !== null && result !== undefined) {
        return result;
      }
    } catch (error) {
      console.warn('a3t: Database query error:', error.message);
      continue;
    }
  }
  
  return null;
}

/**
 * Get current database backend
 * @returns {Object|null} Current database backend
 */
function getDbBackend() {
  return dbBackend;
}

module.exports = {
  MongoDbBackend,
  setDbBackend,
  setMongoDbBackend,
  queryDatabase,
  getDbBackend,
};