require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prioritizeRouter = require('./routes/geminiPrioritize');
const suggestionRouter = require('./routes/aisuggestion');
const agentSuggestionRouter = require('./routes/aisugagent'); // New router

// Check for Gemini API key
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set!');
  process.exit(1);
}

// Initialize Express app
const app = express();

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Mount routers
app.use('/api', prioritizeRouter);
app.use('/api', suggestionRouter);
app.use('/api', agentSuggestionRouter); // Mount new router

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));