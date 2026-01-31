import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/js-client-rest';

dotenv.config();

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'hr_documents';
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE) || 400;
const CHUNK_OVERLAP = 50;
const BATCH_SIZE = 50; // Vectors per Qdrant upsert
const CONCURRENT_EMBEDDINGS = 5; // Parallel embedding requests

const HANDBOOK_PATH = path.join(process.cwd(), 'handbook.txt');

// Initialize Qdrant client
const qdrant = new QdrantClient({ url: QDRANT_URL });

// Progress bar helper
function progressBar(current, total, width = 40) {
  const percent = current / total;
  const filled = Math.round(width * percent);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${(percent * 100).toFixed(1)}% (${current}/${total})`;
}

// Smart text chunking with sentence awareness
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  
  // Clean text
  text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + '\n\n' + paragraph).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      
      const sentences = currentChunk.split(/(?<=[.!?])\s+/);
      const overlapSentences = sentences.slice(-2).join(' ');
      currentChunk = overlapSentences.length < overlap * 2 
        ? overlapSentences + '\n\n' + paragraph 
        : paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // Handle long chunks
  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.length > chunkSize * 1.5) {
      const sentences = chunk.split(/(?<=[.!?])\s+/);
      let subChunk = '';
      for (const sentence of sentences) {
        if ((subChunk + ' ' + sentence).length > chunkSize && subChunk) {
          finalChunks.push(subChunk.trim());
          subChunk = sentence;
        } else {
          subChunk += (subChunk ? ' ' : '') + sentence;
        }
      }
      if (subChunk.trim()) finalChunks.push(subChunk.trim());
    } else {
      finalChunks.push(chunk);
    }
  }
  
  return finalChunks.filter(c => c.length > 20);
}

// Generate embedding with retries
async function generateEmbedding(text, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        `${OLLAMA_URL}/api/embed`,
        { model: EMBEDDING_MODEL, input: text },
        { timeout: 60000 }
      );
      return response.data.embeddings[0];
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

// Process embeddings with concurrency
async function generateEmbeddingsBatch(chunks, startIdx = 0, onProgress) {
  const results = [];
  
  for (let i = 0; i < chunks.length; i += CONCURRENT_EMBEDDINGS) {
    const batch = chunks.slice(i, i + CONCURRENT_EMBEDDINGS);
    const embeddings = await Promise.all(
      batch.map(chunk => generateEmbedding(chunk))
    );
    
    for (let j = 0; j < batch.length; j++) {
      results.push({
        id: startIdx + i + j,
        vector: embeddings[j],
        payload: {
          text: batch[j],
          index: startIdx + i + j,
          length: batch[j].length,
        },
      });
    }
    
    if (onProgress) onProgress(i + batch.length, chunks.length);
  }
  
  return results;
}

async function main() {
  console.log('\n🚀 RAG Embedding Generator with Qdrant\n');
  console.log('━'.repeat(50));
  console.log(`📁 Source: ${HANDBOOK_PATH}`);
  console.log(`🤖 Model: ${EMBEDDING_MODEL}`);
  console.log(`📦 Chunk size: ${CHUNK_SIZE} chars`);
  console.log(`🗄️  Qdrant: ${QDRANT_URL}`);
  console.log(`📚 Collection: ${COLLECTION_NAME}`);
  console.log('━'.repeat(50) + '\n');

  if (!fs.existsSync(HANDBOOK_PATH)) {
    console.error('❌ handbook.txt not found!');
    process.exit(1);
  }

  // Check Qdrant connection
  try {
    await qdrant.getCollections();
    console.log('✅ Connected to Qdrant\n');
  } catch (error) {
    console.error('❌ Cannot connect to Qdrant:', error.message);
    process.exit(1);
  }

  // Read and chunk text
  console.log('📖 Reading document...');
  const text = fs.readFileSync(HANDBOOK_PATH, 'utf-8');
  const fileSizeMB = (Buffer.byteLength(text, 'utf-8') / (1024 * 1024)).toFixed(2);
  console.log(`   Size: ${fileSizeMB} MB`);
  
  console.log('✂️  Chunking text...');
  const chunks = chunkText(text);
  console.log(`   Generated ${chunks.length} chunks\n`);

  const estimatedMinutes = Math.ceil((chunks.length / CONCURRENT_EMBEDDINGS) * 0.5 / 60);
  console.log(`⏱️  Estimated time: ~${estimatedMinutes} minutes\n`);

  // Delete existing collection
  const collections = await qdrant.getCollections();
  if (collections.collections.some(c => c.name === COLLECTION_NAME)) {
    console.log('🗑️  Deleting existing collection...');
    await qdrant.deleteCollection(COLLECTION_NAME);
  }

  // Get embedding dimension
  console.log('📐 Detecting embedding dimension...');
  const sampleEmbedding = await generateEmbedding(chunks[0]);
  const vectorSize = sampleEmbedding.length;
  console.log(`   Dimension: ${vectorSize}\n`);

  // Create collection with HNSW index
  console.log('🏗️  Creating collection with HNSW index...');
  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: { size: vectorSize, distance: 'Cosine' },
    optimizers_config: { indexing_threshold: 20000 },
    hnsw_config: { m: 16, ef_construct: 100 },
  });
  console.log('   Done!\n');

  // Process chunks
  const startTime = Date.now();
  let totalProcessed = 0;
  
  console.log('🔄 Processing chunks...\n');
  
  const MEGA_BATCH = 500;
  
  for (let i = 0; i < chunks.length; i += MEGA_BATCH) {
    const megaBatch = chunks.slice(i, i + MEGA_BATCH);
    const points = await generateEmbeddingsBatch(megaBatch, i, (current, total) => {
      process.stdout.write(`\r${progressBar(i + current, chunks.length)} - Generating embeddings...`);
    });
    
    // Upsert to Qdrant
    for (let j = 0; j < points.length; j += BATCH_SIZE) {
      const batch = points.slice(j, j + BATCH_SIZE);
      await qdrant.upsert(COLLECTION_NAME, { wait: true, points: batch });
    }
    
    totalProcessed += megaBatch.length;
    process.stdout.write(`\r${progressBar(totalProcessed, chunks.length)} - Uploaded to Qdrant    `);
  }

  // Final stats
  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  const collectionInfo = await qdrant.getCollection(COLLECTION_NAME);
  
  console.log('\n\n' + '━'.repeat(50));
  console.log('✅ COMPLETE!\n');
  console.log(`   📊 Vectors stored: ${collectionInfo.points_count}`);
  console.log(`   📐 Dimension: ${vectorSize}`);
  console.log(`   ⏱️  Duration: ${duration} minutes`);
  console.log(`   🚀 Speed: ${(chunks.length / parseFloat(duration)).toFixed(0)} chunks/min`);
  console.log('━'.repeat(50) + '\n');
  console.log('🎉 Ready! Start the server with: npm start\n');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
