import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index.js';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RAG Node Ollama API',
      version: '1.0.0',
      description: 'API for HR assistant using RAG (Retrieval-Augmented Generation) with Ollama',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'HR Assistant',
        description: 'Endpoints for HR assistant queries',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
    ],
    components: {
      schemas: {
        Question: {
          type: 'object',
          required: ['question'],
          properties: {
            question: {
              type: 'string',
              description: 'The question to ask the HR assistant',
              example: 'What is the company policy on remote work?',
              minLength: 1,
              maxLength: 1000,
            },
          },
        },
        Answer: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                answer: {
                  type: 'string',
                  description: 'The AI-generated answer',
                  example: 'Based on the handbook, the company allows flexible remote work arrangements.',
                },
                metadata: {
                  type: 'object',
                  properties: {
                    contextFound: {
                      type: 'boolean',
                      description: 'Whether relevant context was found',
                    },
                    chunksUsed: {
                      type: 'integer',
                      description: 'Number of context chunks used',
                    },
                    processingTime: {
                      type: 'integer',
                      description: 'Processing time in milliseconds',
                    },
                  },
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Question is required',
                },
              },
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded'],
              example: 'healthy',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds',
            },
            services: {
              type: 'object',
              properties: {
                ollama: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['up', 'down'],
                    },
                  },
                },
                vectors: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['loaded', 'not_loaded'],
                    },
                    count: {
                      type: 'integer',
                    },
                    dimension: {
                      type: 'integer',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
