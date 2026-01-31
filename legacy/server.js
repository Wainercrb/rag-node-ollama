import express from "express";
import axios from "axios";
import { retrieveRelevant } from "./retrieve.js";
import swaggerUi from "swagger-ui-express";
import swaggerAutogen from "swagger-autogen";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const OLLAMA = "http://127.0.0.1:11434";

// Generate Swagger automatically
const outputFile = './swagger.json';
const endpointsFiles = ['./server.js'];

const doc = {
  info: {
    version: "1.0.0",
    title: "RAG Node Ollama API",
    description: "API for HR assistant using RAG with Ollama"
  },
  host: "localhost:3000",
  basePath: "/",
  schemes: ['http'],
  consumes: ['application/json'],
  produces: ['application/json'],
  tags: [
    {
      "name": "HR Assistant",
      "description": "Endpoints for HR assistant queries"
    }
  ],
  definitions: {
    Question: {
      question: "What is the company policy on remote work?"
    },
    Answer: {
      answer: "The company allows flexible remote work arrangements."
    }
  }
};

swaggerAutogen()(outputFile, endpointsFiles, doc).then(() => {
  const swaggerDocument = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
});

app.post("/ask-hr", async (req, res) => {
  const question = req.body.question;

  const contextChunks = await retrieveRelevant(question);
  const context = contextChunks.join("\n");

  const response = await axios.post(`${OLLAMA}/api/generate`, {
    model: "llama3",
    prompt: `
      You are an HR assistant.
      Answer ONLY using the context below.

      Context:
      ${context}

      Question:
      ${question}`,
    stream: false
  });

  res.json({ answer: response.data.response });
});

app.listen(3000, () =>
  console.log("Server running at http://localhost:3000")
);