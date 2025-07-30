const express = require('express');
const axios = require('axios');
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

// Use Gemini 2.0 Flash Lite alias
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

/**
 * POST /prioritize
 * Expects: { tickets: [ { problem, description, type } ] }
 * Returns: [ { priority, resolutionTime, reason } ]
 */
router.post('/prioritize', async (req, res) => {
  try {
    const { tickets } = req.body;
    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty tickets array' });
    }

    const results = [];
    for (const ticket of tickets) {
      const { problem = '', description = '', type = '' } = ticket;

      // IMPORTANT: Tell Gemini to only use High, Medium, Low (no Urgent), and always supply a resolutionTime
      const prompt = `
You are a helpdesk ticket prioritization assistant and who also sets resolution time.

Your task:
- Assign a priority to the ticket: ONLY "High", "Medium", or "Low" (do NOT use "Urgent" or any other value) based on the problem, type, and description.
- You must give a realistic, business-like resolutionTime (e.g., "8 hours", "1 business day", "5 business days", "1 week") that matches the urgency/impact based on the problem, type, and description. For example, serious service outages should have quicker resolution times than minor cosmetic issues.For high priority tickets give less resoltion and and for low give more resolution time.
- Give a short reason for your priority.

Respond ONLY in JSON using these exact keys: priority, resolutionTime, reason.


Ticket Problem: ${problem}
Description: ${description}
Type: ${type}
      `;

      // Call Gemini API
      const aiResponse = await axios.post(
        GEMINI_URL,
        { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
        { headers: { 'Content-Type': 'application/json' } }
      );

      // Extract Gemini response
      const text = aiResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Try to extract JSON from code block or plain text
      let parsed = null;
      const codeBlockMatch = text.match(/```json\n([\s\S]+?)\n```/i) || text.match(/```([\s\S]+?)```/i);
      let jsonString = codeBlockMatch ? codeBlockMatch[1] : text;

      try {
        parsed = JSON.parse(jsonString);
      } catch (e) {
        // Try to recover if Gemini returns extra text
        try {
          jsonString = jsonString.replace(/^[^\{]*?(\{[\s\S]+\})[^\}]*$/, '$1');
          parsed = JSON.parse(jsonString);
        } catch {
          // Fallback
          parsed = null;
        }
      }

      // Defensive: Check values and fallback if needed
      let priority = (parsed && typeof parsed.priority === "string")
        ? parsed.priority.trim().toLowerCase()
        : "medium";
      if (!["high", "medium", "low"].includes(priority)) priority = "medium";
      // Capitalize first letter
      priority = priority.charAt(0).toUpperCase() + priority.slice(1);

      let resolutionTime = (parsed && parsed.resolutionTime) ? String(parsed.resolutionTime).trim() : "";
      // If Gemini did not supply, fallback
      if (!resolutionTime) resolutionTime = "2 business days";

      let reason = (parsed && parsed.reason) ? String(parsed.reason).trim() : "No explanation provided by AI.";

      results.push({ priority, resolutionTime, reason });
    }

    return res.json(results);
  } catch (error) {
    console.error('Error prioritizing tickets:', error);
    res.status(500).json({
      error: 'Failed to prioritize tickets using Gemini API',
      details: error.message,
    });
  }
});

module.exports = router;