import { useState, useEffect } from 'react';
import type { LoginResponse } from '../types';
import * as SecureStore from 'expo-secure-store';
import { APP_CONFIG } from '../config/appConfig';
import { router } from '@/.expo/types/router';

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
          //logged in from storage
          setStatusText('Logged in');
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

    // if input dev login for debugging
    if (username == "Dev" && password == "123") {
      setStatusText('dev login complete');
      setLoginState({
        status: 1,
        appKey: "dev_app_key",
        hatchery: 123,
        message: "Dev login successful"
      });
      return;
    }

    setIsLoggingIn(true);
    setStatusText('Logging in...');

    try {
      const response = await fetch(APP_CONFIG.loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          // The API expects "email" as the field name, even though the
          // value here is really just the sensor-app username (confirmed
          // against the working testLogin.py script, which sends the same
          // "SensorApp"-style value under an "email" key).
          email: username,
          password,
        }),
      });

      // Read the raw body once so we can show it for debugging if JSON
      // parsing fails or the server returned a non-OK status with a
      // useful error message in the body.
      const rawText = await response.text();

      if (!response.ok) {
        console.error(`Login HTTP error ${response.status}:`, rawText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let result: LoginResponse;

      try {
        result = JSON.parse(rawText);
      } catch (parseError) {
        console.error('Login response was not valid JSON:', rawText);
        setStatusText('Server did not return valid JSON. See console for details.');
        return;
      }

      if (result.status === 1 && result.appKey && typeof result.hatchery === 'number') {
        // Save securely
        await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(result));

        //login state saved
        setLoginState(result);
        setStatusText('Logged in.');
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

  //set login state
  const isLoggedIn = Boolean(loginState?.appKey && typeof loginState?.hatchery == 'number');


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