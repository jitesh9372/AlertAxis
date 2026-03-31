import { GoogleGenAI } from '@google/genai';
import { responseCache } from '../lib/cache.js';
import { withRetry } from '../lib/retry.js';
import { rateLimiter } from '../lib/rateLimiter.js';
import express from 'express';

const router = express.Router();

const LANG_MAP = { hi: 'Hindi', mr: 'Marathi', en: 'English' };

// Apply per-user rate limit: 10 messages per minute
router.use(rateLimiter({ maxRequests: 10, windowMs: 60_000 }));

router.post('/', async (req, res) => {
  const { message, language = 'en' } = req.body ?? {};

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const cleanMsg = message.trim();
  const cacheKey = `${language}:${cleanMsg.toLowerCase()}`;

  // ── 1. Cache hit → return instantly (zero quota cost) ──────────────────
  const cached = responseCache.get(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] "${cleanMsg.slice(0, 40)}..."`);
    return res.json({ response: cached, cached: true });
  }

  // ── 2. Call Gemini with automatic retry on 429 ─────────────────────────
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured on server.' });
  }

  const ai = new GoogleGenAI({ apiKey });
  const start = Date.now();

  try {
    const response = await withRetry(
      () => callGemini(ai, cleanMsg, language),
      { maxRetries: 3, initialDelayMs: 1200, factor: 2 }
    );

    const latency = Date.now() - start;
    console.log(`[Gemini OK] ${latency}ms — "${cleanMsg.slice(0, 40)}"`);

    // Cache for 1 hour — safety tips don't change frequently
    responseCache.set(cacheKey, response, 3600);

    return res.json({ response });

  } catch (error) {
    const status = error?.status ?? error?.response?.status ?? 500;
    const latency = Date.now() - start;

    console.error(`[Gemini ERROR] status=${status} latency=${latency}ms`, error.message);

    if (status === 429) {
      return res.status(429).json({
        error: '⏳ Our assistant is at capacity right now. Please try again in a moment.',
        retryAfter: 60,
      });
    }

    return res.status(500).json({
      error: '❌ Assistant is temporarily unavailable. If you\'re in danger, call 112 or press the SOS button.',
    });
  }
});

async function callGemini(ai, message, language) {
  const lang = LANG_MAP[language] || 'English';

  const result = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{
      role: 'user',
      parts: [{
        text: `You are a Safety Assistant for AlertAxis, a 24/7 emergency response app.
Answer in ${lang}. Be concise (max 3 sentences). Prioritize life-safety.
If the user is in immediate danger, instruct them to press the SOS button or call 112 immediately.

User: ${message}`,
      }],
    }],
    config: {
      systemInstruction: 'You are a calm, helpful, expert safety assistant. Provide clear actionable advice for emergencies and safety situations.',
      maxOutputTokens: 300, // keeps cost low; 300 tokens ≈ ~225 words — plenty for safety tips
      temperature: 0.6,
    },
  });

  const text = result.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

export default router;
