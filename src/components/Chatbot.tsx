import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';
import { translations, Language } from '../i18n/translations';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

interface ChatbotProps {
  currentLanguage: Language;
}

export const Chatbot: React.FC<ChatbotProps> = ({ currentLanguage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: translations[currentLanguage].chatbotWelcome }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = translations[currentLanguage];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyB6qnn8tLK32Rjl3p6w03IPcSkjIKx9n_c";
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `You are a 24/7 Safety Assistant for AlertAxis, an emergency response app. 
            Answer the user's question in ${currentLanguage === 'hi' ? 'Hindi' : currentLanguage === 'mr' ? 'Marathi' : 'English'}.
            Be concise, helpful, and prioritize safety. If the user is in immediate danger, tell them to use the SOS button or call 112.
            
            User Question: ${userMessage}` }]
          }
        ],
        config: {
          systemInstruction: "You are a helpful safety assistant. Provide clear, actionable advice for emergencies and safety concerns."
        }
      });

      const botResponse = response.text || "I'm sorry, I couldn't process that. Please try again or use the SOS button if you're in danger.";
      setMessages(prev => [...prev, { role: 'bot', content: botResponse }]);
    } catch (error) {
      console.error("Chatbot error:", error);
      const isKeyPresent = !!(import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyB6qnn8tLK32Rjl3p6w03IPcSkjIKx9n_c");
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessages(prev => [...prev, { role: 'bot', content: `Connection error (Key present: ${isKeyPresent}): ${errorMessage}. Please check console for details.` }]);
    } finally {
      setIsLoading(false);
    }
  };

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
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}
                >
                  <div className={cn(
                    "max-w-[80%] p-4 rounded-[24px] text-sm shadow-sm",
                    msg.role === 'user' 
                      ? "bg-primary text-white rounded-tr-none shadow-red-500/10" 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-none"
                  )}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-[24px] rounded-tl-none flex gap-1">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 0.6 }}
                      className="w-1.5 h-1.5 bg-primary rounded-full" 
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                      className="w-1.5 h-1.5 bg-primary rounded-full" 
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                      className="w-1.5 h-1.5 bg-primary rounded-full" 
                    />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={t.chatbotPlaceholder}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none dark:text-white"
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="p-2 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors"
                >
                  <Send className="w-5 h-5" />
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
          "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 relative group overflow-hidden",
          isOpen ? "bg-slate-100 dark:bg-slate-800 text-slate-600" : "bg-amber-600 text-white"
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
