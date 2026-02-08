import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from './Icon';

interface BottomNavProps {
  // onNavigate is no longer needed as we use internal navigation
  activeScreen?: any; // kept for compatibility if needed, but logic moves to location check
}

export const BottomNav: React.FC<BottomNavProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const getActiveClass = (path: string) => {
    return isActive(path) ? 'text-primary' : 'text-slate-400 dark:text-slate-500';
  };

  const getActiveBg = (path: string) => {
    return isActive(path) ? 'bg-primary/10 text-primary' : 'group-hover:bg-primary/5';
  };

  const navItemVariants = {
    tap: { scale: 0.9 },
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe pt-2 px-6 z-50">
      <div className="flex justify-between items-center max-w-md mx-auto h-16">
        <motion.button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-1 group w-16 ${getActiveClass('/')}`}
          whileTap="tap"
          variants={navItemVariants}
        >
          <div
            className={`flex items-center justify-center w-12 h-8 rounded-full transition-colors ${getActiveBg('/')}`}
          >
            <Icon name="dashboard" />
          </div>
          <span className="text-[10px] font-medium">Home</span>
        </motion.button>

        <motion.button
          onClick={() => navigate('/library')}
          className={`flex flex-col items-center gap-1 group w-16 ${getActiveClass('/library')}`}
          whileTap="tap"
          variants={navItemVariants}
        >
          <div
            className={`flex items-center justify-center w-12 h-8 rounded-full transition-colors ${getActiveBg('/library')}`}
          >
            <Icon name="menu_book" />
          </div>
          <span className="text-[10px] font-medium">Vocab</span>
        </motion.button>

        <motion.button
          onClick={() => navigate('/settings')}
          className={`flex flex-col items-center gap-1 group w-16 ${getActiveClass('/settings')}`}
          whileTap="tap"
          variants={navItemVariants}
        >
          <div
            className={`flex items-center justify-center w-12 h-8 rounded-full transition-colors ${getActiveBg('/settings')}`}
          >
            <Icon name="settings" />
          </div>
          <span className="text-[10px] font-medium">Settings</span>
        </motion.button>
      </div>
      <div className="h-4 w-full"></div>
    </nav>
  );
};
