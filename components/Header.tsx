"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ensureSessionId } from '@/utils/session';
import Icon from './Icon';

interface HeaderProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Header({ isOpen, setIsOpen }: HeaderProps) {
  const [user, setUser] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const router = useRouter();

  const pages = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Delegations', path: '/delegation', icon: '📋' },
    { name: 'Todo', path: '/todo', icon: '✅' },
    { name: 'Users', path: '/users', icon: '👥' },
    { name: 'Chat', path: '/chat', icon: '💬' },
  ];

  const filteredPages = pages.filter(page =>
    page.name.toLowerCase().includes(searchQuery.toLowerCase())
  );



  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sessionId = ensureSessionId();
        const response = await fetch('/api/auth', { headers: { 'x-session-id': sessionId } });
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    const sessionId = ensureSessionId();
    await fetch('/api/logout', { method: 'POST', headers: { 'x-session-id': sessionId } });
    router.push('/login');
  };


  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  const handlePageNavigation = (path: string) => {
    router.push(path);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  return (
    <>
      <motion.header
        className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between px-4 py-4">
          {/* Left: Menu Toggle */}
          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            className="hidden lg:block p-2 rounded-xl text-gray-800 dark:text-gray-200 hover:bg-[#f4d24a]/20 dark:hover:bg-gray-700 transition-all"
            title="Toggle sidebar"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon name="menu" size={24} />
          </motion.button>

          {/* Center: Search */}
          <div className="flex-1 mx-4 max-w-md relative">
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#f5f1e8] dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#f4d24a] outline-none transition-all"
              />
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showSearchResults && searchQuery && (
                <motion.div
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden z-50"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {filteredPages.length > 0 ? (
                    <div className="py-2">
                      {filteredPages.map((page) => (
                        <button
                          key={page.path}
                          onClick={() => handlePageNavigation(page.path)}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f4d24a]/20 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          <span className="text-xl">{page.icon}</span>
                          <span className="text-gray-900 dark:text-white font-medium">{page.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
                      No pages found
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Icons and Profile */}
          <div className="flex items-center gap-3">
            {/* Fullscreen toggle */}

            <motion.button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-[#f4d24a]/20 dark:hover:bg-gray-700 transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m0 6v4a2 2 0 002 2h4m6-18h4a2 2 0 012 2v4m0 6v4a2 2 0 01-2 2h-4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l-4-4m0 0h4m-4 0v4m10 6l4 4m0 0h-4m4 0v-4" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9V5a2 2 0 012-2h4m6 0h4a2 2 0 012 2v4m0 6v4a2 2 0 01-2 2h-4m-6 0H5a2 2 0 01-2-2v-4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3L5 7m0 0h4M5 7V3m10 14l4-4m0 0h-4m4 0v4" />
                </svg>
              )}
            </motion.button>

            {/* Chat Notification */}
            <motion.button
              onClick={() => router.push('/chat')}
              className="relative p-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-[#f4d24a]/20 dark:hover:bg-gray-700 transition"
              title="Messages"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
            </motion.button>

            {/* Notifications */}
            <motion.button
              className="relative p-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-[#f4d24a]/20 dark:hover:bg-gray-700 transition"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full" />
            </motion.button>

            {/* User Profile */}
            <div className="relative">
              <motion.button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white dark:bg-gray-700 hover:bg-[#f4d24a]/20 dark:hover:bg-gray-600 transition shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {user?.image_url ? (
                  <img
                    src={user.image_url}
                    alt={user.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-[#f4d24a] rounded-full flex items-center justify-center text-gray-900 text-sm font-bold">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {user?.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Admin
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden z-50"
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="p-4 bg-[#f5f1e8] dark:bg-gray-700">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.username || 'Admin User'}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Administrator</p>
                    </div>
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowProfileModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f4d24a]/20 dark:hover:bg-gray-700 rounded-lg transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        My Profile
                      </button>
                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#f4d24a]/20 dark:hover:bg-gray-700 rounded-lg transition"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
            />

            {/* Modal */}
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => setShowProfileModal(false)}
            >
              <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-[#f4d24a] to-[#e5c33a] p-6 relative">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition"
                  >
                    <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-6">
                    {/* Profile Photo */}
                    <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden">
                      {user?.image_url ? (
                        <img
                          src={user.image_url}
                          alt={user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                          {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 text-gray-900">
                      <h2 className="text-2xl font-bold">{user?.username || 'User'}</h2>
                      <p className="text-sm opacity-80 mt-1">Administrator</p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                  {/* Account Information */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Account Information</h3>
                    <div className="space-y-4">
                      <div className="bg-[#f5f1e8] dark:bg-gray-700 p-4 rounded-xl">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Username</label>
                        <p className="text-gray-900 dark:text-white font-medium mt-1">{user?.username || 'N/A'}</p>
                      </div>

                      <div className="bg-[#f5f1e8] dark:bg-gray-700 p-4 rounded-xl">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Email</label>
                        <p className="text-gray-900 dark:text-white font-medium mt-1">{user?.email || 'N/A'}</p>
                      </div>

                      <div className="bg-[#f5f1e8] dark:bg-gray-700 p-4 rounded-xl">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Role</label>
                        <p className="text-gray-900 dark:text-white font-medium mt-1">Administrator</p>
                      </div>

                      <div className="bg-[#f5f1e8] dark:bg-gray-700 p-4 rounded-xl">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">User ID</label>
                        <p className="text-gray-900 dark:text-white font-medium mt-1 font-mono text-sm">{user?.id || 'N/A'}</p>
                      </div>

                      {user?.created_at && (
                        <div className="bg-[#f5f1e8] dark:bg-gray-700 p-4 rounded-xl">
                          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Member Since</label>
                          <p className="text-gray-900 dark:text-white font-medium mt-1">
                            {new Date(user.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowProfileModal(false)}
                      className="flex-1 px-6 py-3 bg-[#f4d24a] hover:bg-[#e5c33a] text-gray-900 font-semibold rounded-xl transition shadow-md"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
