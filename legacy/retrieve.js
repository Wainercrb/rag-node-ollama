import fs from "fs";
import axios from "axios";

const vectors = JSON.parse(fs.readFileSync("vectors.json"));
const OLLAMA = "http://127.0.0.1:11434";

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return dot / (magA * magB);
}

export async function retrieveRelevant(query, k = 2) {
  const res = await axios.post(`${OLLAMA}/api/embed`, {
    model: "nomic-embed-text",
    input: query
  });

  const queryEmbedding = res.data.embeddings[0];

  return vectors
    .map(v => ({
      text: v.text,
      score: cosineSimilarity(queryEmbedding, v.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(v => v.text);
}