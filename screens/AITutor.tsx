import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { getGeminiTutorModel } from '../utils/gemini';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const STORAGE_KEY = 'lingoflow-ai-tutor-history';
const DEFAULT_GREETING: Message = {
  role: 'model',
  text: "Hello! I'm your LingoFlow AI Tutor. I can help you practice your target language, explain grammar, or just chat. What would you like to work on today?",
};

const loadMessages = (): Message[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load chat history:', e);
  }
  return [DEFAULT_GREETING];
};

const saveMessages = (messages: Message[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (e) {
    console.error('Failed to save chat history:', e);
  }
};

export const AITutor: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize chat session with history (excluding the default greeting)
  const chat = useMemo(() => {
    const model = getGeminiTutorModel();
    const storedMessages = loadMessages();

    // Convert messages to Gemini history format (skip first greeting message)
    const geminiHistory = storedMessages.slice(1).map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    return model.startChat({
      history: geminiHistory,
      generationConfig: {
        maxOutputTokens: 4500,
      },
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save messages whenever they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const result = await chat.sendMessage(userText);
      const response = await result.response;
      setMessages((prev) => [...prev, { role: 'model', text: response.text() }]);
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: "Sorry, I'm having some trouble connecting right now. Please check your API key." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
    // Reset messages to default
    setMessages([{ role: 'model', text: 'Chat cleared. How can I help you now?' }]);
    setShowMenu(false);
    // Note: The chat session keeps its history in memory until page refresh
    // User should refresh for a completely fresh start
  };

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark font-display">
      {/* Header */}
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-surface-dark sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 text-slate-500 hover:text-primary">
          <Icon name="chevron_left" size={28} />
        </button>
        <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <Icon name="robot_2" size={24} filled />
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-slate-900 dark:text-white">AI Tutor</h1>
          <div className="flex items-center gap-1.5">
            <div className="size-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active</span>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Icon name="more_vert" />
          </button>
          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-1 z-20">
                <button
                  onClick={handleClearChat}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors font-bold"
                >
                  <Icon name="delete" size={16} />
                  Clear Chat
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm font-medium leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-none'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-none'
              }`}
            >
              {msg.role === 'user' ? (
                msg.text
              ) : (
                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-headings:text-primary prose-headings:font-bold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-code:bg-slate-100 prose-code:dark:bg-slate-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-primary prose-code:font-mono prose-code:text-xs prose-pre:bg-slate-100 prose-pre:dark:bg-slate-900 prose-pre:rounded-lg prose-strong:text-primary prose-a:text-primary prose-blockquote:border-primary prose-blockquote:text-slate-500">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex gap-1">
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="size-1.5 bg-slate-400 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                className="size-1.5 bg-slate-400 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                className="size-1.5 bg-slate-400 rounded-full"
              />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl p-2 px-4 focus-within:ring-2 ring-primary/30 transition-all">
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-transparent border-none outline-none py-2 text-slate-900 dark:text-white placeholder-slate-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`size-10 rounded-xl flex items-center justify-center transition-all ${
              input.trim() ? 'bg-primary text-white shadow-lg' : 'text-slate-400'
            }`}
          >
            <Icon name="send" size={20} filled={!!input.trim()} />
          </button>
        </div>
      </footer>
    </div>
  );
};
