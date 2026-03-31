import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

// ─── Client-side guard: 1 request per 3 seconds per session ──────────────────
const MIN_INTERVAL_MS = 3000;

export const Chatbot: React.FC<ChatbotProps> = ({ currentLanguage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: translations[currentLanguage].chatbotWelcome }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSentAt = useRef(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const t = translations[currentLanguage];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Countdown timer when rate-limited
  const startCountdown = useCallback((seconds: number) => {
    setRetryCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const addBotMessage = (content: string, isError = false) => {
    setMessages(prev => [...prev, { role: 'bot', content, isError }]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || retryCountdown > 0) return;

    // ── Client-side throttle (last line of defence before the server) ─────
    const now = Date.now();
    if (now - lastSentAt.current < MIN_INTERVAL_MS) {
      addBotMessage('⏳ Please wait a moment before sending another message.', true);
      return;
    }
    lastSentAt.current = now;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pass anonymous session ID so server-side rate limit is per-user
          'x-user-id': getSessionId(),
        },
        body: JSON.stringify({ message: userMessage, language: currentLanguage }),
      });

      const data = await res.json();

      if (res.status === 429) {
        const waitSec = data.retryAfter ?? 60;
        startCountdown(waitSec);
        addBotMessage(
          `⏳ Our assistant is busy. Please try again in ${waitSec} seconds.`,
          true
        );
        return;
      }

      if (!res.ok) {
        addBotMessage(
          data.error ?? '❌ Something went wrong. If you\'re in danger, press the SOS button or call 112.',
          true
        );
        return;
      }

      addBotMessage(data.response);
    } catch {
      addBotMessage(
        '❌ Connection lost. If you are in danger, press the SOS button or call 112 immediately.',
        true
      );
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div className={cn(
                    'max-w-[80%] p-4 rounded-[24px] text-sm shadow-sm flex items-start gap-2',
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-none'
                      : msg.isError
                        ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-tl-none border border-amber-200 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-none'
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-[24px] rounded-tl-none flex gap-1">
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay }}
                        className="w-1.5 h-1.5 bg-primary rounded-full"
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
                <p className="text-xs text-amber-500 text-center mb-2">
                  ⏳ Retry available in {retryCountdown}s
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={retryCountdown > 0 ? `Wait ${retryCountdown}s...` : t.chatbotPlaceholder}
                  disabled={retryCountdown > 0}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none dark:text-white disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={isSendDisabled}
                  className="p-2 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors"
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

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 relative group overflow-hidden',
          isOpen ? 'bg-slate-100 dark:bg-slate-800 text-slate-600' : 'bg-amber-600 text-white'
        )}
      >
        {!isOpen && (
          <>
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-amber-400 rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
              className="absolute inset-0 bg-amber-400 rounded-full"
            />
          </>
        )}
        <div className="relative z-10">
          {isOpen ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
        </div>
      </motion.button>
    </div>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a stable anonymous session ID for this browser tab */
function getSessionId(): string {
  const key = 'alertaxis_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}
