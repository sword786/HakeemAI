import React, { useEffect } from 'react';
import { IconVerified } from './Icons';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-stone-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border border-stone-700/50">
        <IconVerified className="w-5 h-5 text-hakeem-gold" />
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
};
