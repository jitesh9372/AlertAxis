import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { cn } from '../lib/utils';
import { translations, Language } from '../i18n/translations';

interface Message {
  role: 'user' | 'bot';
  content: string;
  isError?: boolean;
}

interface ChatbotProps {
  currentLanguage: Language;
}

const LANG_MAP: Record<string, string> = { hi: 'Hindi', mr: 'Marathi', en: 'English' };

// ── Simple in-memory response cache (saves quota on repeated questions) ───────
const responseCache = new Map<string, string>();

// ── Per-session rate limit: max 10 messages per minute ───────────────────────
const sentTimestamps: number[] = [];
function isRateLimited(): number {
  const now = Date.now();
  // Drop timestamps older than 1 minute
  while (sentTimestamps.length > 0 && now - sentTimestamps[0] > 60_000) {
    sentTimestamps.shift();
  }
  if (sentTimestamps.length >= 10) {
    return Math.ceil((60_000 - (now - sentTimestamps[0])) / 1000);
  }
  return 0;
}

// ── Exponential backoff sleep ─────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SYSTEM_PROMPT = `You are a friendly, knowledgeable 24/7 Safety Assistant for AlertAxis, an emergency response app.
You can answer ANY question the user asks — safety tips, general knowledge, first aid, emergency procedures, and more.
Be helpful, warm, and conversational. Keep responses concise (2-4 sentences).
If someone is in immediate danger, always tell them to press the SOS button or call 112 immediately.`;

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
  // Keep full chat history for multi-turn context
  const historyRef = useRef<{ role: 'user' | 'model'; text: string }[]>([]);

  const t = translations[currentLanguage];
  const lang = LANG_MAP[currentLanguage] || 'English';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Clean up countdown timer on unmount
  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const startCountdown = useCallback((seconds: number) => {
    setRetryCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const addBotMessage = (content: string, isError = false) => {
    setMessages(prev => [...prev, { role: 'bot', content, isError }]);
  };

  const callGeminiWithRetry = async (userMessage: string): Promise<string> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('NO_KEY');

    const ai = new GoogleGenAI({ apiKey });
    let delay = 1000;

    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        // Build contents array: system + full history + new message
        const contents = [
          // Inject the system prompt as the first user/model exchange
          { role: 'user' as const, parts: [{ text: SYSTEM_PROMPT }] },
          { role: 'model' as const, parts: [{ text: 'Understood! I\'m ready to help.' }] },
          // Previous conversation turns
          ...historyRef.current.map(h => ({
            role: h.role as 'user' | 'model',
            parts: [{ text: h.text }],
          })),
          // The new user message
          { role: 'user' as const, parts: [{ text: `Answer in ${lang}. ${userMessage}` }] },
        ];

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents,
          config: { maxOutputTokens: 400, temperature: 0.7 },
        });

        return response.text ?? '';
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        const status = e?.status;

        if (status === 429 && attempt < 3) {
          const wait = Math.min(delay + Math.random() * 500, 15000);
          console.warn(`[Gemini] 429 — retry ${attempt + 1} in ${wait.toFixed(0)}ms`);
          await sleep(wait);
          delay *= 2;
          continue;
        }
        throw err;
      }
    }
    throw new Error('Max retries exceeded');
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || retryCountdown > 0) return;

    // ── Rate limit check ──────────────────────────────────────────────────
    const waitSec = isRateLimited();
    if (waitSec > 0) {
      startCountdown(waitSec);
      addBotMessage(`⏳ You're sending messages too quickly. Please wait ${waitSec} seconds.`, true);
      return;
    }
    sentTimestamps.push(Date.now());

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // ── Cache check ───────────────────────────────────────────────────────
    const cacheKey = `${currentLanguage}:${userMessage.toLowerCase()}`;
    const cached = responseCache.get(cacheKey);
    if (cached) {
      historyRef.current.push({ role: 'user', text: userMessage });
      historyRef.current.push({ role: 'model', text: cached });
      setIsLoading(false);
      addBotMessage(cached);
      return;
    }

    try {
      const botText = await callGeminiWithRetry(userMessage);

      if (!botText) {
        addBotMessage("I couldn't generate a response. Please try again.", true);
        return;
      }

      // Save to history & cache
      historyRef.current.push({ role: 'user', text: userMessage });
      historyRef.current.push({ role: 'model', text: botText });
      // Keep history manageable (last 20 turns = 10 exchanges)
      if (historyRef.current.length > 20) historyRef.current = historyRef.current.slice(-20);

      responseCache.set(cacheKey, botText);
      addBotMessage(botText);

    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      const status = e?.status;

      if (status === 429) {
        startCountdown(60);
        addBotMessage('⏳ The AI quota is currently full. Please try again in about a minute.', true);
      } else if ((e?.message ?? '').includes('NO_KEY')) {
        addBotMessage('⚙️ API key not set. Please add VITE_GEMINI_API_KEY to your .env file.', true);
      } else {
        addBotMessage("⚠️ Something went wrong. If you're in danger, press the SOS button or call 112.", true);
      }
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
            className="w-[350px] md:w-[400px] h-[500px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="p-4 bg-primary text-white flex items-center justify-between">
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
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20, y: 8 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div className={cn(
                    'max-w-[82%] px-4 py-3 rounded-[22px] text-sm shadow-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-sm'
                      : msg.isError
                        ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-tl-sm border border-amber-200 dark:border-amber-800 flex items-start gap-2'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-sm'
                  )}>
                    {msg.isError && msg.role === 'bot' && (
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                    )}
                    <span>{msg.content}</span>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-[22px] rounded-tl-sm flex gap-1 items-center">
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay }}
                        className="w-2 h-2 bg-primary rounded-full"
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              {retryCountdown > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-amber-500 text-center mb-2 font-medium"
                >
                  ⏳ Retry in {retryCountdown}s
                </motion.p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={retryCountdown > 0 ? `Wait ${retryCountdown}s...` : t.chatbotPlaceholder}
                  disabled={isLoading || retryCountdown > 0}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none dark:text-white disabled:opacity-50 transition-opacity"
                />
                <button
                  onClick={handleSend}
                  disabled={isSendDisabled}
                  className="p-2 bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-all active:scale-95"
                >
                  {isLoading
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <Send className="w-5 h-5" />
                  }
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Toggle */}
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
