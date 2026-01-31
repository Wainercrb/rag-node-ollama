import express from 'express';
import { vectorService } from '../services/vectorService.js';
import { ollamaService } from '../services/ollamaService.js';
import { validateAskHR } from '../middleware/validate.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /ask-hr:
 *   post:
 *     summary: Ask a question to the HR assistant
 *     description: Uses RAG to retrieve relevant context and generate an AI response
 *     tags: [HR Assistant]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Question'
 *     responses:
 *       200:
 *         description: Question answered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Answer'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: Ollama service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/ask-hr', rateLimiter, validateAskHR, async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const { question } = req.validatedBody;
    
    logger.info('Processing question', { 
      question: question.substring(0, 100),
      ip: req.ip,
    });

    // Retrieve relevant context
    const contextChunks = await vectorService.retrieveRelevant(question);
    
    if (contextChunks.length === 0) {
      return res.json({
        success: true,
        data: {
          answer: "I don't have enough context to answer that question. Please try rephrasing or ask about topics covered in the handbook.",
          metadata: {
            contextFound: false,
            processingTime: Date.now() - startTime,
          },
        },
      });
    }

    const context = contextChunks.join('\n\n');

    // Generate response
    const prompt = `You are an HR assistant. Answer ONLY using the context below. If the answer is not in the context, say "I don't have information about that."

Context:
${context}

Question: ${question}

Answer:`;

    const answer = await ollamaService.generateResponse(prompt);

    const processingTime = Date.now() - startTime;
    
    logger.info('Question answered', { 
      processingTime,
      contextChunks: contextChunks.length,
    });

    res.json({
      success: true,
      data: {
        answer,
        metadata: {
          contextFound: true,
          chunksUsed: contextChunks.length,
          processingTime,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
