"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "./Icon";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [color, setColor] = useState<string>(typeof window !== "undefined" ? localStorage.getItem('color') || 'default' : 'default');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      setIsDark(true);
    } else {
      document.documentElement.removeAttribute('data-theme');
      setIsDark(false);
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    if (color && color !== 'default') {
      document.documentElement.setAttribute('data-color', color);
      localStorage.setItem('color', color);
    } else {
      document.documentElement.removeAttribute('data-color');
      localStorage.removeItem('color');
    }
  }, [color]);

  return (
    <div className="flex items-center gap-2">
      <motion.button
        onClick={() => setIsDark((s) => !s)}
        className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition relative"
        title="Toggle theme"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Icon name="moon" size={22} />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Icon name="sun" size={22} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <select
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-sm border-none outline-none focus:ring-2 focus:ring-blue-500 transition"
        title="Accent color"
      >
        <option value="default">Default</option>
        <option value="teal">Teal</option>
        <option value="corporate">Corporate</option>
      </select>
    </div>
  );
}
