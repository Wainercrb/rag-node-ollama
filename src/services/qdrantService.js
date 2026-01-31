import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const client = new QdrantClient({
  url: config.qdrant.url,
  apiKey: config.qdrant.apiKey || undefined,
});

const COLLECTION_NAME = config.qdrant.collection;

export const qdrantService = {
  client,

  async ensureCollection(vectorSize = 768) {
    try {
      const collections = await client.getCollections();
      const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

      if (!exists) {
        logger.info('Creating Qdrant collection', { name: COLLECTION_NAME, vectorSize });
        await client.createCollection(COLLECTION_NAME, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine',
          },
          optimizers_config: {
            indexing_threshold: 20000,
          },
          hnsw_config: {
            m: 16,
            ef_construct: 100,
          },
        });
        logger.info('Collection created successfully');
      } else {
        logger.debug('Collection already exists', { name: COLLECTION_NAME });
      }
      return true;
    } catch (error) {
      logger.error('Failed to ensure collection', { error: error.message });
      throw error;
    }
  },

  async upsertBatch(points) {
    try {
      await client.upsert(COLLECTION_NAME, {
        wait: true,
        points,
      });
      return true;
    } catch (error) {
      logger.error('Failed to upsert batch', { error: error.message });
      throw error;
    }
  },

  async search(vector, limit = 3) {
    try {
      const results = await client.search(COLLECTION_NAME, {
        vector,
        limit,
        with_payload: true,
      });
      return results;
    } catch (error) {
      logger.error('Qdrant search failed', { error: error.message });
      throw error;
    }
  },

  async getCollectionInfo() {
    try {
      const info = await client.getCollection(COLLECTION_NAME);
      return {
        vectorsCount: info.vectors_count,
        pointsCount: info.points_count,
        status: info.status,
      };
    } catch (error) {
      return null;
    }
  },

  async deleteCollection() {
    try {
      await client.deleteCollection(COLLECTION_NAME);
      logger.info('Collection deleted', { name: COLLECTION_NAME });
      return true;
    } catch (error) {
      logger.error('Failed to delete collection', { error: error.message });
      return false;
    }
  },

  async healthCheck() {
    try {
      await client.getCollections();
      return true;
    } catch {
      return false;
    }
  },
};
