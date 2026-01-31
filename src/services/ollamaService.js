import axios from 'axios';
import { config } from '../config/index.js';
import { OllamaError, TimeoutError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const ollamaClient = axios.create({
  baseURL: config.ollama.url,
  timeout: config.ollama.timeout,
});

export const ollamaService = {
  async getEmbedding(text) {
    try {
      logger.debug('Generating embedding', { textLength: text.length });
      
      const response = await ollamaClient.post('/api/embed', {
        model: config.ollama.embeddingModel,
        input: text,
      });

      return response.data.embeddings[0];
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new TimeoutError('Embedding generation timed out');
      }
      if (error.code === 'ECONNREFUSED') {
        throw new OllamaError('Cannot connect to Ollama. Is it running?');
      }
      logger.error('Embedding error', { error: error.message });
      throw new OllamaError(`Failed to generate embedding: ${error.message}`);
    }
  },

  async generateResponse(prompt) {
    try {
      logger.debug('Generating response', { promptLength: prompt.length });
      
      const response = await ollamaClient.post('/api/generate', {
        model: config.ollama.model,
        prompt,
        stream: false,
      });

      return response.data.response;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new TimeoutError('Response generation timed out');
      }
      if (error.code === 'ECONNREFUSED') {
        throw new OllamaError('Cannot connect to Ollama. Is it running?');
      }
      logger.error('Generation error', { error: error.message });
      throw new OllamaError(`Failed to generate response: ${error.message}`);
    }
  },

  async healthCheck() {
    try {
      await ollamaClient.get('/api/tags', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  },
};
