import express from 'express';
import { ollamaService } from '../services/ollamaService.js';
import { vectorService } from '../services/vectorService.js';
import { qdrantService } from '../services/qdrantService.js';

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: Service is degraded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/health', async (req, res) => {
  const ollamaHealthy = await ollamaService.healthCheck();
  const qdrantHealthy = await qdrantService.healthCheck();
  const vectorStats = await vectorService.getStats();
  
  const isHealthy = ollamaHealthy && qdrantHealthy && vectorStats.ready;
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      ollama: {
        status: ollamaHealthy ? 'up' : 'down',
      },
      qdrant: {
        status: qdrantHealthy ? 'up' : 'down',
        collection: vectorStats.qdrant?.collection,
        vectorCount: vectorStats.qdrant?.vectorCount || 0,
      },
    },
  });
});

/**
 * @swagger
 * /ready:
 *   get:
 *     summary: Readiness check endpoint
 *     description: Returns whether the service is ready to accept requests
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                   example: true
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (req, res) => {
  const ollamaHealthy = await ollamaService.healthCheck();
  const qdrantHealthy = await qdrantService.healthCheck();
  const vectorStats = await vectorService.getStats();
  
  if (ollamaHealthy && qdrantHealthy && vectorStats.ready) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

export default router;
