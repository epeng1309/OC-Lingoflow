import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { motion } from 'framer-motion';

export const Help: React.FC = () => {
    const navigate = useNavigate();

    const sections = [
        {
            title: "Getting Started",
            icon: "rocket_launch",
            color: "text-blue-500 bg-blue-50",
            content: "LingoFlow is a high-performance language learning app. You can create 'Decks' to organize your vocabulary and practice them using Flashcards or AI-powered sessions."
        },
        {
            title: "AI Tutor",
            icon: "robot_2",
            color: "text-indigo-500 bg-indigo-50",
            content: "Practice your speaking and writing with a generative AI tutor. Ask questions about grammar, or just chat in your target language."
        },
        {
            title: "AI Enhanced Flashcards",
            icon: "auto_awesome",
            color: "text-emerald-500 bg-emerald-50",
            content: "While studying flashcards, tap 'Enhance with AI' on the back of a card. Gemini will generate natural example sentences to provide real-world context."
        },
        {
            title: "AI Power Quiz",
            icon: "psychology",
            color: "text-orange-500 bg-orange-50",
            content: "Found in any Deck screen. AI will analyze the words in that deck and create a unique, dynamic multiple-choice quiz for you."
        },
        {
            title: "CSV Import",
            icon: "file_upload",
            color: "text-purple-500 bg-purple-50",
            content: "Transitioning from Google Translate or another app? Export your list as a .csv and upload it directly into any deck using the import tool."
        }
    ];

    return (
        <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark font-display">
            <header className="p-6 pb-2 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-primary">
                    <Icon name="arrow_back" size={28} />
                </button>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Help Center</h1>
            </header>

            <main className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {sections.map((section, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`size-12 rounded-2xl flex items-center justify-center ${section.color} dark:bg-slate-700`}>
                                <Icon name={section.icon} filled />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{section.title}</h3>
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">
                            {section.content}
                        </p>
                    </motion.div>
                ))}

                <div className="pt-6 pb-10 text-center">
                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Version 1.2.0 • Powered by Gemini AI</p>
                </div>
            </main>
        </div>
    );
};
