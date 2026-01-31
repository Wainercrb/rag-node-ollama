import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  ollama: {
    url: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
    model: process.env.OLLAMA_MODEL || 'llama3',
    embeddingModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
    timeout: parseInt(process.env.OLLAMA_TIMEOUT) || 30000,
  },
  
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || '',
    collection: process.env.QDRANT_COLLECTION || 'hr_documents',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20,
  },
  
  rag: {
    chunkSize: parseInt(process.env.CHUNK_SIZE) || 400,
    topK: parseInt(process.env.TOP_K_RESULTS) || 3,
  },
  
  isProd: () => process.env.NODE_ENV === 'production',
};
