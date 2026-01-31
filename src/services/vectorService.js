import { config } from '../config/index.js';
import { ollamaService } from './ollamaService.js';
import { qdrantService } from './qdrantService.js';
import { logger } from '../utils/logger.js';

let isReady = false;

export const vectorService = {
  async initialize() {
    if (isReady) return;
    
    try {
      const healthy = await qdrantService.healthCheck();
      if (!healthy) {
        logger.warn('Qdrant is not available');
        return;
      }
      
      const info = await qdrantService.getCollectionInfo();
      if (info) {
        logger.info('Qdrant collection ready', { 
          collection: config.qdrant.collection,
          vectors: info.pointsCount 
        });
        isReady = true;
      } else {
        logger.warn('Qdrant collection not found. Run: npm run embed');
      }
    } catch (error) {
      logger.error('Failed to initialize vector service', { error: error.message });
    }
  },

  async retrieveRelevant(query, k = config.rag.topK) {
    if (!isReady) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    // Generate query embedding
    const queryEmbedding = await ollamaService.getEmbedding(query);

    // Search in Qdrant
    const results = await qdrantService.search(queryEmbedding, k);

    logger.debug('Vector search completed', {
      query: query.substring(0, 50),
      topScore: results[0]?.score?.toFixed(4),
      resultsCount: results.length,
      duration: Date.now() - startTime,
    });

    return results.map(r => r.payload.text);
  },

  async getStats() {
    const qdrantHealthy = await qdrantService.healthCheck();
    const collectionInfo = await qdrantService.getCollectionInfo();
    
    return {
      ready: isReady,
      qdrant: {
        connected: qdrantHealthy,
        collection: config.qdrant.collection,
        vectorCount: collectionInfo?.pointsCount || 0,
        status: collectionInfo?.status || 'unknown',
      },
    };
  },
};
