import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Icon } from '../components/Icon';
import { generateQuiz, QuizQuestion } from '../utils/gemini';
import { motion, AnimatePresence } from 'framer-motion';

export const AIQuiz: React.FC = () => {
    const navigate = useNavigate();
    const { deckId } = useParams<{ deckId: string }>();
    const { words, decks } = useStore();

    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [quizFinished, setQuizFinished] = useState(false);

    const deck = decks.find(d => d.id === deckId);
    const sessionWords = deckId ? words.filter(w => w.deckId === deckId) : words.slice(0, 10);

    useEffect(() => {
        const fetchQuiz = async () => {
            if (sessionWords.length < 3) {
                setLoading(false);
                return;
            }
            const quiz = await generateQuiz(
                sessionWords.slice(0, 10),
                deck?.fromLang || 'German',
                deck?.toLang || 'English'
            );
            setQuestions(quiz);
            setLoading(false);
        };
        fetchQuiz();
    }, [deckId]);

    const handleAnswer = (option: string) => {
        if (isAnswered) return;
        setSelectedOption(option);
        setIsAnswered(true);
        if (option === questions[currentIndex].correctAnswer) {
            setScore(s => s + 1);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(c => c + 1);
            setSelectedOption(null);
            setIsAnswered(false);
        } else {
            setQuizFinished(true);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white p-6 text-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="size-12 border-4 border-primary border-t-transparent rounded-full mb-4"
                />
                <h2 className="text-xl font-bold italic">Gemini is crafting a custom quiz for you...</h2>
                <p className="text-slate-500 mt-2">Analyzing your vocabulary and generating questions.</p>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-background-light dark:bg-background-dark">
                <Icon name="error_outline" size={64} className="text-rose-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Not enough words</h2>
                <p className="text-slate-500 mt-2">You need at least 3 words in this deck to generate an AI Quiz.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-6 px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg"
                >
                    Go Back
                </button>
            </div>
        );
    }

    if (quizFinished) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-10 text-center bg-background-light dark:bg-background-dark">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="size-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 text-emerald-600"
                >
                    <Icon name="emoji_events" size={48} />
                </motion.div>
                <h2 className="text-3xl font-bold dark:text-white">Quiz Complete!</h2>
                <p className="text-xl text-slate-500 mt-2">You scored <span className="text-primary font-black">{score}/{questions.length}</span></p>

                <div className="w-full mt-10 space-y-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 active:scale-95 transition-transform"
                    >
                        Return to Deck
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold active:scale-95 transition-transform"
                    >
                        Retake Quiz
                    </button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark font-display overflow-hidden">
            <header className="p-6 pb-2 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                    <Icon name="close" size={28} />
                </button>
                <div className="text-center">
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">AI Power Quiz</p>
                    <p className="text-sm font-medium text-slate-400">Question {currentIndex + 1} of {questions.length}</p>
                </div>
                <div className="size-10" /> {/* Spacer */}
            </header>

            {/* Progress Bar */}
            <div className="px-6 h-1.5 w-full">
                <div className="h-full w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            <main className="flex-1 p-6 flex flex-col pt-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex-1 flex flex-col"
                    >
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
                            {currentQ.question}
                        </h2>

                        <div className="space-y-3">
                            {currentQ.options.map((option, idx) => {
                                const isSelected = selectedOption === option;
                                const isCorrect = option === currentQ.correctAnswer;
                                const showResult = isAnswered;

                                let borderColor = "border-slate-200 dark:border-slate-700";
                                let bgColor = "bg-white dark:bg-slate-800";
                                let textColor = "text-slate-700 dark:text-slate-200";

                                if (showResult) {
                                    if (isCorrect) {
                                        borderColor = "border-emerald-500";
                                        bgColor = "bg-emerald-50 dark:bg-emerald-900/20";
                                        textColor = "text-emerald-700 dark:text-emerald-400";
                                    } else if (isSelected) {
                                        borderColor = "border-rose-500";
                                        bgColor = "bg-rose-50 dark:bg-rose-900/20";
                                        textColor = "text-rose-700 dark:text-rose-400";
                                    }
                                } else if (isSelected) {
                                    borderColor = "border-primary";
                                    bgColor = "bg-primary/5";
                                }

                                return (
                                    <motion.button
                                        key={idx}
                                        whileHover={!showResult ? { scale: 1.02 } : {}}
                                        whileTap={!showResult ? { scale: 0.98 } : {}}
                                        onClick={() => handleAnswer(option)}
                                        disabled={showResult}
                                        className={`w-full p-5 text-left rounded-2xl border-2 transition-all duration-200 font-semibold text-lg flex justify-between items-center ${borderColor} ${bgColor} ${textColor}`}
                                    >
                                        <span>{option}</span>
                                        {showResult && isCorrect && <Icon name="check_circle" className="text-emerald-500" />}
                                        {showResult && isSelected && !isCorrect && <Icon name="cancel" className="text-rose-500" />}
                                    </motion.button>
                                );
                            })}
                        </div>

                        {isAnswered && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800"
                            >
                                <div className="flex gap-3">
                                    <Icon name="info" size={20} className="text-primary shrink-0" />
                                    <p className="text-sm text-blue-800 dark:text-blue-300">{currentQ.explanation}</p>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            <footer className="p-6">
                {isAnswered ? (
                    <button
                        onClick={nextQuestion}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                        {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
                        <Icon name="arrow_forward" size={20} />
                    </button>
                ) : (
                    <div className="text-center py-4 text-slate-400 text-sm font-medium">
                        Select an answer to continue
                    </div>
                )}
            </footer>
        </div>
    );
};
