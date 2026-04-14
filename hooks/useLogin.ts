import { useState, useEffect } from 'react';
import type { LoginResponse } from '../types';

const STORAGE_KEY = 'turtle_app_login_state';

export function useLogin() {
  const [loginState, setLoginState] = useState<LoginResponse | null>(null);
  const [statusText, setStatusText] = useState('Not logged in');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Load saved login on app start
  useEffect(() => {
    loadSavedLogin();
  }, []);

  async function loadSavedLogin() {
    try {
      const saved = await SecureStore.getItemAsync(STORAGE_KEY);
      if (saved) {
        const parsed: LoginResponse = JSON.parse(saved);
        if (parsed.status === 1 && parsed.appKey && typeof parsed.hatchery === 'number') {
          setLoginState(parsed);
          setStatusText('Logged in (from storage)');
        }
      }
    } catch (e) {
      console.warn('Failed to load saved login', e);
    }
  }

  async function handleLogin() {
    if (!username || !password) {
      setStatusText('Please enter username and password');
      return;
    }

    setIsLoggingIn(true);
    setStatusText('Logging in...');

    try {
      const response = await fetch(APP_CONFIG.loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          // Add any other fields your server expects
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: LoginResponse = await response.json();

      if (result.status === 1 && result.appKey && typeof result.hatchery === 'number') {
        // Save securely
        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(result));

        setLoginState(result);
        setStatusText('Login successful! Credentials saved securely.');
      } else {
        setStatusText(result.message ?? 'Login failed or access denied.');
      }
    } catch (error: any) {
      setStatusText(`Login error: ${error.message || String(error)}`);
      console.error('Login failed:', error);
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function logout() {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      setLoginState(null);
      setStatusText('Logged out');
    } catch (e) {
      console.warn('Logout error', e);
    }
  }

  const isLoggedIn = Boolean(loginState?.appKey && typeof loginState?.hatchery === 'number');

  return {
    username,
    setUsername,
    password,
    setPassword,
    statusText,
    isLoggingIn,
    isLoggedIn,
    loginState,
    handleLogin,
    logout,
    loadSavedLogin, // optional: call again if needed
  };
}