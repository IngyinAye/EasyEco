const express = require('express');
const axios = require('axios');

const router = express.Router();

const METER_ASSISTANT_PROMPT = `
You are EasyEco Meter Assistant. Your only purpose is to help with electricity
meters and household electricity usage: meter readings, kWh units, electricity
bills, appliance consumption, saving electricity, and safe, general meter-use
guidance.

Users may attach photos of an electricity meter, meter reading, or bill. Read
the visible information carefully and explain only what the image supports. If
a number is blurry or missing, say so instead of guessing.

Reply in the same language as the user's latest message. If the user writes in
Myanmar (Burmese), reply entirely in clear Myanmar language. If the user writes
in English, reply entirely in English. For mixed-language messages, use the
language that is most prominent.

Keep answers practical, concise, and easy to understand. Ask for the required
numbers when a bill or consumption calculation cannot be made accurately.
Do not invent local tariffs, meter readings, or account information.
For electrical danger, tampering, exposed wires, or suspected meter faults,
tell the user to contact their electricity provider or a qualified electrician.

If a request is not about an electricity meter or electricity usage, politely
say that you can only assist with meter and electricity-usage questions, in the
same language as the user's question, and give a relevant example question.
`;

router.post('/', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'A chat message is required.' });
  }

  const safeMessages = messages
    .filter((message) => ['user', 'assistant'].includes(message?.role))
    .map((message) => {
      if (typeof message.content === 'string') {
        return { role: message.role, content: message.content.trim() };
      }

      if (Array.isArray(message.content)) {
        const content = message.content.filter((part) => {
          if (part?.type === 'text') return typeof part.text === 'string' && part.text.trim();
          return part?.type === 'image_url' &&
            typeof part.image_url?.url === 'string' &&
            part.image_url.url.startsWith('data:image/');
        });
        return { role: message.role, content };
      }

      return null;
    })
    .filter((message) => message && (Array.isArray(message.content)
      ? message.content.length > 0
      : message.content.length > 0))
    .slice(-12);

  if (safeMessages.length === 0) {
    return res.status(400).json({ message: 'A valid chat message is required.' });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ message: 'OpenRouter API key is not configured.' });
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: METER_ASSISTANT_PROMPT },
          ...safeMessages,
        ],
        temperature: 0.4,
        // Burmese responses use several tokens per visible character. Allow
        // enough room for a complete, multi-paragraph answer.
        max_tokens: 1200,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'X-OpenRouter-Title': 'EasyEco Meter Assistant',
        },
        timeout: 30000,
      }
    );

    const answer = response.data?.choices?.[0]?.message?.content;
    res.json({ answer: answer || 'No answer was returned.' });
  } catch (error) {
    console.error('OpenRouter chat error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.error?.message || 'Unable to get an AI response.',
    });
  }
});

module.exports = router;
