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

// Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Helper: get semantic similarity score (0-1) using Gemini
async function getGeminiSimilarity(desc1, desc2) {
  const prompt = `Compare these two helpdesk ticket descriptions. Reply with only a number between 0 and 1 (1 = identical, 0 = totally different):\n\nDescription A: ${desc1}\n\nDescription B: ${desc2}\n\nSimilarity:`;
  const res = await axios.post(
    `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`,
    {
      contents: [
        { role: "user", parts: [{ text: prompt }] }
      ]
    }
  );
  // Extract similarity score from Gemini's response
  if (res.data.candidates && res.data.candidates[0].content && res.data.candidates[0].content.parts) {
    const text = res.data.candidates[0].content.parts[0].text;
    const match = text.match(/([0-9]*\.?[0-9]+)/);
    let score = match ? parseFloat(match[1]) : 0;
    return isNaN(score) ? 0 : score;
  }
  return 0;
}

router.post('/suggestion', async (req, res) => {
  try {
    const { description, organization } = req.body;
    if (!description || !organization) {
      return res.status(400).json({ error: 'Description and organization are required' });
    }

    // Fetch tickets for the organization
    const snapshot = await db.collection('tickets')
      .where('organization', '==', organization)
      .get();

    const tickets = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.description && data.remarks) {
        tickets.push({
          id: doc.id,
          problem: data.problem || '',
          description: data.description || '',
          remarks: data.remarks || '',
        });
      }
    });

    // Compute similarity for each ticket (sequential version)
    const ticketSimilarities = [];
    for (const ticket of tickets) {
      const sim = await getGeminiSimilarity(description, ticket.description);
      ticketSimilarities.push({ sim, ticket });
    }

    // Sort and filter top matches
    const topN = 5;
    const sorted = ticketSimilarities
      .sort((a, b) => b.sim - a.sim)
      .slice(0, topN)
      .filter(item => item.sim > 0.6); // Only show strong matches

    const suggestions = sorted.map(({ sim, ticket }) => ({
      problem: ticket.problem,
      remarks: Array.isArray(ticket.remarks) && ticket.remarks[0] && ticket.remarks[0].text
        ? ticket.remarks[0].text
        : "",
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