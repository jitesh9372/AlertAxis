import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Loader2, Shield, AlertTriangle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { translations, Language } from '../i18n/translations';

/* ─────────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────────── */
interface Message {
  role: 'user' | 'bot';
  content: string;
  isError?: boolean;
  provider?: 'gemini' | 'ai';
}

interface ChatbotProps {
  currentLanguage: Language;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────────────────────── */
const LANG_MAP: Record<string, string> = { hi: 'Hindi', mr: 'Marathi', en: 'English' };

const SYSTEM_PROMPT = `You are a helpful, friendly AI assistant integrated into AlertAxis — a 24/7 emergency response and safety app.
You can answer ANY question the user asks: general knowledge, math, safety tips, first aid, emergencies, or casual conversation.
Be warm, concise (2–4 sentences), and helpful. Always respond in the same language the user writes in.
If someone is in immediate danger, tell them to press the SOS button or call 112 immediately.`;

/* ─────────────────────────────────────────────────────────────────────────────
   Simple response cache (avoids hitting the API for identical questions)
───────────────────────────────────────────────────────────────────────────── */
const cache = new Map<string, string>();

/* ─────────────────────────────────────────────────────────────────────────────
   Per-session rate limit  (max 15 msgs / minute)
───────────────────────────────────────────────────────────────────────────── */
const sentAt: number[] = [];
function checkRateLimit(): number {
  const now = Date.now();
  while (sentAt.length && now - sentAt[0] > 60_000) sentAt.shift();
  if (sentAt.length >= 15) return Math.ceil((60_000 - (now - sentAt[0])) / 1000);
  return 0;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/* ─────────────────────────────────────────────────────────────────────────────
   Provider 1 — Google Gemini  (tries gemini-1.5-flash first, then 2.0-flash)
───────────────────────────────────────────────────────────────────────────── */
async function callGemini(
  history: { role: string; text: string }[],
  userMessage: string,
  lang: string
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error('NO_KEY'), { isNoKey: true });

  // Try models in order — flash-8b has the highest free quota
  const models = ['gemini-1.5-flash-8b', 'gemini-1.5-flash', 'gemini-2.0-flash'];

  for (const model of models) {
    try {
      const contents = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Got it! Ready to help.' }] },
        ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: `Respond in ${lang}. ${userMessage}` }] },
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
          }),
        }
      );

      if (res.status === 429) {
        // Try next model
        console.warn(`[Gemini] ${model} → 429, trying next model...`);
        continue;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw Object.assign(new Error(err?.error?.message ?? `HTTP ${res.status}`), { status: res.status });
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      throw new Error('Empty response');
    } catch (e: unknown) {
      const err = e as { status?: number; isNoKey?: boolean };
      if (err?.isNoKey) throw e; // don't retry
      if (model === models[models.length - 1]) throw e; // last model failed
      // otherwise continue to next model
    }
  }
  throw new Error('All Gemini models quota exceeded');
}

/* ─────────────────────────────────────────────────────────────────────────────
   Provider 2 — Pollinations.ai  (100% free, no API key, CORS enabled)
   Uses open-source LLMs (Llama 3, Mistral, etc.)
───────────────────────────────────────────────────────────────────────────── */
async function callPollinations(
  history: { role: string; text: string }[],
  userMessage: string,
  lang: string
): Promise<string> {
  const messages = [
    { role: 'system', content: `${SYSTEM_PROMPT}\nAlways respond in ${lang}.` },
    ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text })),
    { role: 'user', content: userMessage },
  ];

  const res = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      model: 'openai',          // routes to an OpenAI-compatible model
      temperature: 0.7,
      max_tokens: 400,
      private: true,            // don't log conversation publicly
    }),
  });

  if (!res.ok) throw new Error(`Pollinations error: ${res.status}`);

  // Pollinations returns plain text
  const text = await res.text();
  if (!text?.trim()) throw new Error('Empty response from Pollinations');
  return text.trim();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main AI caller:  Gemini → Pollinations fallback
───────────────────────────────────────────────────────────────────────────── */
async function getAIResponse(
  history: { role: string; text: string }[],
  userMessage: string,
  lang: string
): Promise<{ text: string; provider: 'gemini' | 'ai' }> {
  // 1. Try Gemini
  try {
    const text = await callGemini(history, userMessage, lang);
    return { text, provider: 'gemini' };
  } catch (geminiErr) {
    console.warn('[Gemini] Failed, switching to Pollinations.ai…', geminiErr);
  }

  // 2. Fallback: Pollinations.ai (no key, always free)
  let retries = 2;
  let delay = 800;
  while (retries-- > 0) {
    try {
      const text = await callPollinations(history, userMessage, lang);
      return { text, provider: 'ai' };
    } catch (e) {
      if (retries === 0) throw e;
      await sleep(delay);
      delay *= 2;
    }
  }
  throw new Error('All providers failed');
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────────────────── */
export const Chatbot: React.FC<ChatbotProps> = ({ currentLanguage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: translations[currentLanguage].chatbotWelcome }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const historyRef = useRef<{ role: string; text: string }[]>([]);

  const t = translations[currentLanguage];
  const lang = LANG_MAP[currentLanguage] || 'English';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const startCountdown = useCallback((seconds: number) => {
    setRetryCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setRetryCountdown(p => { if (p <= 1) { clearInterval(countdownRef.current!); return 0; } return p - 1; });
    }, 1000);
  }, []);

  const addBot = (content: string, isError = false, provider?: 'gemini' | 'ai') => {
    setMessages(prev => [...prev, { role: 'bot', content, isError, provider }]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || retryCountdown > 0) return;

    const waitSec = checkRateLimit();
    if (waitSec > 0) {
      startCountdown(waitSec);
      addBot(`⏳ Too many messages. Please wait ${waitSec}s.`, true);
      return;
    }
    sentAt.push(Date.now());

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Cache check
    const cacheKey = `${currentLanguage}:${userMessage.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      historyRef.current.push({ role: 'user', text: userMessage }, { role: 'model', text: cached });
      setIsLoading(false);
      addBot(cached);
      return;
    }

    try {
      const { text, provider } = await getAIResponse(historyRef.current, userMessage, lang);

      historyRef.current.push({ role: 'user', text: userMessage }, { role: 'model', text });
      if (historyRef.current.length > 24) historyRef.current = historyRef.current.slice(-24);
      cache.set(cacheKey, text);

      addBot(text, false, provider);
    } catch {
      addBot("⚠️ Our assistant is temporarily unavailable. If you're in danger, press the SOS button or call 112.", true);
    } finally {
      setIsLoading(false);
    }
  };

  const isSendDisabled = isLoading || !input.trim() || retryCountdown > 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[350px] md:w-[400px] h-[520px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="p-4 bg-primary text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span className="font-bold">{t.chatbotTitle}</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div className="flex flex-col gap-1 max-w-[82%]">
                    <div className={cn(
                      'px-4 py-3 rounded-[20px] text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-tr-sm'
                        : msg.isError
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-tl-sm border border-amber-200 dark:border-amber-700 flex items-start gap-2'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-sm'
                    )}>
                      {msg.isError && msg.role === 'bot' && (
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                      )}
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    </div>
                    {/* Provider badge */}
                    {msg.role === 'bot' && msg.provider && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 px-1">
                        <Zap className="w-2.5 h-2.5" />
                        {msg.provider === 'gemini' ? 'Gemini AI' : 'AI Assistant'}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-[20px] rounded-tl-sm flex gap-1.5 items-center">
                    {[0, 0.15, 0.3].map((delay, i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay }}
                        className="w-2 h-2 bg-primary rounded-full"
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
              {retryCountdown > 0 && (
                <p className="text-xs text-amber-500 text-center mb-2 font-medium">⏳ Retry in {retryCountdown}s</p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={retryCountdown > 0 ? `Wait ${retryCountdown}s...` : t.chatbotPlaceholder}
                  disabled={isLoading || retryCountdown > 0}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none dark:text-white disabled:opacity-50 transition-opacity"
                />
                <button
                  onClick={handleSend}
                  disabled={isSendDisabled}
                  className="p-2.5 bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-all active:scale-95"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 relative overflow-hidden',
          isOpen ? 'bg-slate-100 dark:bg-slate-800 text-slate-600' : 'bg-amber-600 text-white'
        )}
      >
        {!isOpen && (
          <>
            <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-amber-400 rounded-full" />
            <motion.div animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }} className="absolute inset-0 bg-amber-400 rounded-full" />
          </>
        )}
        <div className="relative z-10">
          {isOpen ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
        </div>
      </motion.button>
    </div>
  );
};
