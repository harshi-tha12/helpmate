const express = require('express');
const axios = require('axios');
const router = express.Router();
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Firebase init
const serviceAccountPath = path.join(__dirname, '../config/serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

// Helper: sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: retry Gemini call with exponential backoff
async function callGeminiWithRetry(prompt, retries = 3, delay = 1000) {
  try {
    const res = await axios.post(GEMINI_URL, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              similarity: { type: "NUMBER" }
            }
          }
        }
      }
    });
    return res;
  } catch (err) {
    if (err.response?.status === 429 && retries > 0) {
      console.warn(`Rate limit hit. Retrying in ${delay} ms...`);
      await sleep(delay);
      return callGeminiWithRetry(prompt, retries - 1, delay * 2);
    }
    throw err;
  }
}

// Helper: get similarity scores for multiple tickets in one API call
async function getGeminiSimilarities(currentDescription, pastTickets) {
  const prompt = `Compare the current ticket description to each past ticket description. Output a JSON array of objects, each with 'id' (the ticket ID as string) and 'similarity' (number between 0 and 1, where 1 is identical).\n\nCurrent Description: ${currentDescription}\n\nPast Tickets:\n${pastTickets.map(t => `ID: ${t.id}, Description: ${t.description}`).join('\n')}`;

  const res = await callGeminiWithRetry(prompt);
  console.log('Gemini raw response text:', res.data.candidates[0].content.parts[0].text); // For debugging

  if (res.data && res.data.candidates && res.data.candidates[0]?.content?.parts) {
    try {
      const jsonText = res.data.candidates[0].content.parts[0].text;
      const similarities = JSON.parse(jsonText);
      return similarities;
    } catch (parseError) {
      console.error('Failed to parse Gemini JSON:', parseError);
      return [];
    }
  }
  return [];
}

router.post('/agentsuggestion', async (req, res) => {
  try {
    const { description, organization } = req.body;
    if (!description || !organization) {
      return res.status(400).json({ error: 'Description and organization are required' });
    }

    // Fetch CLOSED tickets for the organization
    const snapshot = await db.collection('tickets')
      .where('organization', '==', organization)
      .where('status', '==', 'Closed')
      .get();

    const tickets = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.description && data.remarks && Array.isArray(data.remarks) && data.remarks.length > 0) {
        tickets.push({
          id: doc.id,
          problem: data.problem || '',
          description: data.description || '',
          remarks: data.remarks,
        });
      }
    });

    if (tickets.length === 0) {
      return res.json({ suggestions: [] });
    }

    // Get similarities in one API call
    const ticketSimilarities = await getGeminiSimilarities(description, tickets);

    // Map similarities to tickets
    const topN = 5;
    const sorted = ticketSimilarities
      .map(({ id, similarity }) => {
        const ticket = tickets.find(t => t.id === id);
        return ticket ? { sim: similarity, ticket } : null;
      })
      .filter(item => item && item.sim > 0.5) // Adjustable threshold
      .sort((a, b) => b.sim - a.sim)
      .slice(0, topN);

    const suggestions = sorted.map(({ sim, ticket }) => ({
      problem: ticket.problem,
      remarks: ticket.remarks[ticket.remarks.length - 1]?.text || "", // Use last remark's text
      similarity: sim,
      ticketId: ticket.id,
    }));

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestion error:', error.message, error.response?.data);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      details: error.message,
    });
  }
});

module.exports = router;