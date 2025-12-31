"use client";

import { motion } from 'framer-motion';

export default function Loader({ size = 56, label, variant = 'spinner' }: { size?: number; label?: string; variant?: 'spinner' | 'pulse' }) {
  if (variant === 'pulse') {
    return (
      <div className="ui-loader">
        <div className="loader-pulse">
          <motion.span
            animate={{ scale: [0.6, 1, 0.6], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            animate={{ scale: [0.6, 1, 0.6], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          />
          <motion.span
            animate={{ scale: [0.6, 1, 0.6], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          />
        </div>
        {label && (
          <motion.div 
            className="text-sm text-slate-600 dark:text-slate-400 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {label}
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="ui-loader">
      <motion.div 
        className="ui-spinner" 
        style={{ width: size, height: size }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      />
      {label && (
        <motion.div 
          className="text-sm text-slate-600 dark:text-slate-400"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {label}
        </motion.div>
      )}
    </div>
  );
}
