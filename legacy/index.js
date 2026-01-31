import fs from "fs";
import axios from "axios";

const OLLAMA = "http://localhost:11434";

const text = fs.readFileSync("handbook.txt", "utf-8");
const chunks = text.match(/(.|[\r\n]){1,400}/g);

const vectors = [];

for (const chunk of chunks) {
  const res = await axios.post(`${OLLAMA}/api/embed`, {
    model: "nomic-embed-text",
    input: chunk
  });

  vectors.push({
    text: chunk,
    embedding: res.data.embeddings[0]
  });
}

fs.writeFileSync("vectors.json", JSON.stringify(vectors, null, 2));