import 'dotenv/config';
import express from 'express';
import chatRouter from './routes/chat.js';

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(express.json({ limit: '16kb' }));

// CORS — only needed if running frontend on a different origin
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────
app.use('/api/chat', chatRouter);

// Health check — useful for uptime monitors
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`✅ AlertAxis API server running on http://localhost:${PORT}`);
  console.log(`   Gemini key: ${process.env.VITE_GEMINI_API_KEY ? '✅ loaded' : '❌ MISSING'}`);
});
