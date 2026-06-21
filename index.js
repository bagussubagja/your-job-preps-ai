const express = require('express');
const path = require('path');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Gemini AI Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';

const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

// API Endpoint - POST /api/chat
app.post('/api/chat', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in .env' });
    }

    const { conversation, systemInstruction } = req.body;

    if (!Array.isArray(conversation)) {
      throw new Error('Messages must be an array!');
    }

    const contents = conversation.map(({ role, text, parts }) => ({
      role,
      parts: parts || [{ text }]
    }));

    const model = ai.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemInstruction || ''
    });

    const response = await model.generateContent({
      contents,
      generationConfig: {
        temperature: 0.9
      }
    });

    res.status(200).json({ result: response.response.text() });
  } catch (e) {
    console.error('Server Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
