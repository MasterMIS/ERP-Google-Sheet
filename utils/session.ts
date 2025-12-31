export const ensureSessionId = (): string => {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    sessionStorage.setItem('sessionId', sessionId);
  }

  return sessionId;
};

export const sessionHeader = (): Record<string, string> => {
  const sessionId = ensureSessionId();
  return sessionId ? { 'x-session-id': sessionId } : {};
};
