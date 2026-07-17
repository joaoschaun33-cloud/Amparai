import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/src/utils/firebase';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const TOKEN_KEY = 'amparai_session_token';

type User = { user_id: string; email: string; name: string; picture?: string | null };

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function saveToken(t: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_KEY, t);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, t);
  }
}
async function readToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}
async function clearToken() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

async function registerForPush(user_id: string) {
  if (Platform.OS === 'web') return;
  try {
    const perm = await Notifications.requestPermissionsAsync();
    if (perm.status !== 'granted') return;
    const tokenResp = await Notifications.getDevicePushTokenAsync();
    await fetch(`${BACKEND}/api/register-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id,
        platform: Platform.OS,
        device_token: tokenResp.data,
      }),
    });
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const authFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const currentUser = auth.currentUser;
    const t = currentUser ? await currentUser.getIdToken() : (token || (await readToken()));
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    };
    if (t) headers['Authorization'] = `Bearer ${t}`;
    return fetch(`${BACKEND}${path}`, { ...init, headers });
  }, [token]);

  const loadMe = useCallback(async (t: string) => {
    try {
      const r = await fetch(`${BACKEND}/api/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
      if (r.status === 200) {
        const data = await r.json();
        setUser(data);
        setToken(t);
        registerForPush(data.user_id).catch(() => {});
        return true;
      }
    } catch {}
    await clearToken();
    setUser(null);
    setToken(null);
    return false;
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const t = await firebaseUser.getIdToken();
        await saveToken(t);
        setToken(t);
        await loadMe(t);
      } else {
        await clearToken();
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [loadMe]);

  const loginWithGoogle = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } else {
        if (__DEV__) {
          await signInWithEmailAndPassword(auth, "demo@amparai.com.br", "demo123456");
        } else {
          throw new Error("Login do Google nativo não configurado em ambiente de produção.");
        }
      }
      return true;
    } catch (e) {
      console.error("Login failed:", e);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      const t = token || (await readToken());
      if (t) {
        await fetch(`${BACKEND}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${t}` } });
      }
    } catch {}
    await clearToken();
    setUser(null);
    setToken(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithGoogle, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
