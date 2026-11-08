import { useCallback, useEffect, useState } from 'react';
import { AuthContext } from './auth-context';
import { getMe, refreshSession, setAccessToken, setAuthExpiredHandler } from '../services/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const signOut = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);
  const acceptSession = useCallback(({ token, user: nextUser }) => {
    setAccessToken(token);
    setUser(nextUser);
  }, []);
  const updateUser = useCallback((patch) => setUser((current) => current ? { ...current, ...patch } : current), []);

  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthExpiredHandler(signOut);
    let active = true;
    (async () => {
      try {
        await refreshSession();
        const profile = await getMe();
        if (active && profile.success) setUser(profile.data);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      setAuthExpiredHandler(null);
    };
  }, [signOut]);

  return <AuthContext.Provider value={{ user, loading, acceptSession, signOut, updateUser }}>{children}</AuthContext.Provider>;
}
