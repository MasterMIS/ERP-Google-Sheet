'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensureSessionId } from '@/utils/session';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const sessionId = ensureSessionId();
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Add a small delay to ensure cookie is set, then redirect
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e5e5e5] dark:bg-gray-900 p-4">
      <div className="w-full max-w-6xl h-[90vh] max-h-[700px] bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl overflow-hidden flex">
        
        {/* Left Side - Login Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 md:p-12 lg:p-16 bg-gradient-to-br from-[#f5f1e8] to-[#e8dcc8] dark:from-gray-800 dark:to-gray-900 overflow-y-auto">
          
          {/* Form Content */}
          <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full my-4">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
                Welcome back
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Login to ERP System
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-600 dark:border-red-700 text-red-700 dark:text-red-400 rounded-xl animate-shake">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-4 bg-white dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 text-gray-900 dark:text-white placeholder-gray-400 shadow-sm transition-all"
                  placeholder="Enter your username"
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-white dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 text-gray-900 dark:text-white placeholder-gray-400 shadow-sm transition-all pr-12"
                    placeholder="••••••••••••••••••"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 transform hover:scale-110 active:scale-95"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#f4d24a] hover:bg-[#f0c935] disabled:bg-gray-300 dark:disabled:bg-gray-600 text-gray-900 dark:text-gray-900 font-semibold py-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            {/* Test Credentials */}
            <div className="mt-6 p-4 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-xl border-2 border-gray-800 dark:border-gray-300">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Test Credentials:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">Username: <span className="font-mono font-bold">admin</span></p>
              <p className="text-sm text-gray-700 dark:text-gray-300">Password: <span className="font-mono font-bold">admin123</span></p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            <span>Need access? </span>
            <a href="#" className="text-gray-900 dark:text-white font-semibold underline hover:text-gray-700 dark:hover:text-gray-300">
              Contact Admin
            </a>
          </div>
        </div>

        {/* Right Side - ERP Features Illustration */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#fff9e6] via-[#ffefc4] to-[#ffe8a8] dark:from-gray-700 dark:to-gray-800 relative overflow-hidden">
          <div className="absolute inset-0 p-6">
            
            {/* Background Decorative Elements */}
            <div className="absolute top-10 right-10 w-16 h-16 bg-[#ffd966] rounded-full opacity-30 blur-xl"></div>
            <div className="absolute bottom-20 left-10 w-24 h-24 bg-[#ffb347] rounded-full opacity-20 blur-2xl"></div>
            
            {/* Layout Container */}
            <div className="relative h-full flex flex-col justify-between py-2">
              
              {/* Top Row */}
              <div className="flex justify-between items-start gap-3 mb-3">
                {/* Delegation Card */}
                <div className="bg-[#f4d24a] rounded-2xl p-3 shadow-xl transform -rotate-2 hover:rotate-0 transition-transform flex-shrink-0 border-4 border-gray-900 dark:border-white">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Delegation</p>
                      <p className="text-xs text-gray-700">Assign & Track Tasks</p>
                    </div>
                  </div>
                </div>

                {/* Calendar Widget */}
                <div className="bg-white dark:bg-gray-700 rounded-2xl p-3 shadow-xl transform rotate-2 hover:rotate-0 transition-transform border-4 border-gray-900 dark:border-white">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">December 2025</p>
                    <div className="grid grid-cols-7 gap-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          {day}
                        </div>
                      ))}
                      {[22, 23, 24, 25, 26, 27, 28].map((date) => (
                        <div 
                          key={date} 
                          className={`text-xs p-1 rounded ${date === 25 ? 'bg-[#f4d24a] font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                          {date}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Central ERP System */}
              <div className="flex-1 flex items-center justify-center px-4 py-2">
                <div className="bg-white dark:bg-gray-600 rounded-3xl shadow-2xl p-5 w-full max-w-md">
                  <div className="text-center mb-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl mb-2">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">ERP System</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Complete Business Solution</p>
                  </div>
                  
                  {/* ERP Features Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 p-2 rounded-xl">
                      <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">Todo & Checklist</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 p-2 rounded-xl">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">Journal</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 p-2 rounded-xl">
                      <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">Purchase</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-2 rounded-xl col-span-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">Lead to Sales</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex justify-between items-end gap-3 mt-3">
                {/* O2D Card */}
                <div className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-xl p-3 shadow-lg transform -rotate-1 hover:rotate-0 transition-transform border-4 border-gray-900 dark:border-white">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold">O2D</p>
                      <p className="text-xs opacity-90">Order to Delivery</p>
                    </div>
                  </div>
                </div>

                {/* Journal Entry Card */}
                <div className="bg-white dark:bg-gray-700 rounded-xl p-3 shadow-lg transform rotate-1 hover:rotate-0 transition-transform border-4 border-gray-900 dark:border-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Journal Entry</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-600 dark:text-gray-400">
                      <span>Debit</span>
                      <span className="font-mono">$1,250</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-600 dark:text-gray-400">
                      <span>Credit</span>
                      <span className="font-mono">$1,250</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
