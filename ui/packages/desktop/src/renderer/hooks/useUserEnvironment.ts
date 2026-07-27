import { useEffect, useState } from 'react';
import { onboardingManager } from '@renderer/components/onboarding/OnboardingManager';

export interface UserEnvironment {
  userName: string;
  pcName: string;
  timezone: string;
  timezoneOffset: number;
  greeting: string;
  weather: WeatherInfo | null;
}

interface WeatherInfo {
  temp: number;
  condition: string;
  icon: string;
  location: string;
}

const GREETINGS_BY_HOUR = [
  { end: 5, text: '🌙 Late night' },
  { end: 11, text: '🌅 Good morning' },
  { end: 13, text: '☀️ Good noon' },
  { end: 17, text: '🌤️ Good afternoon' },
  { end: 20, text: '🌆 Good evening' },
  { end: 24, text: '🌙 Good night' },
];

function getGreeting(): string {
  const h = new Date().getHours();
  for (const g of GREETINGS_BY_HOUR) if (h < g.end) return g.text;
  return '👋 Hello';
}

async function detectPcName(): Promise<string> {
  try {
    const res = await fetch('/api/zoya/pc-name');
    if (res.ok) {
      const data = await res.json();
      return data.name || data.hostname || 'Unknown PC';
    }
  } catch {}
  try {
    const res = await fetch('/api/zoya/env');
    if (res.ok) {
      const data = await res.json();
      return data.computerName || data.hostname || 'Unknown PC';
    }
  } catch {}
  return 'Unknown PC';
}

async function getLocationForWeather(): Promise<{ lat: number; lon: number } | null> {
  const state = onboardingManager.getState();
  if (state.latitude && state.longitude) return { lat: state.latitude, lon: state.longitude };
  try {
    const res = await fetch('/api/zoya/location');
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) return { lat: data.latitude, lon: data.longitude };
    }
  } catch {}
  return null;
}

export function useUserEnvironment(): UserEnvironment {
  const [env, setEnv] = useState<UserEnvironment>({
    userName: '',
    pcName: 'Loading...',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    greeting: getGreeting(),
    weather: null,
  });

  useEffect(() => {
    const state = onboardingManager.getState();
    const name = state.name || window.__INITIAL_STATE__?.user?.name || process.env.USERNAME || 'User';

    detectPcName().then((pcName) => {
      setEnv((prev) => ({ ...prev, userName: name, pcName }));
    });

    // Fetch weather
    getLocationForWeather().then((loc) => {
      if (!loc) return;
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current_weather=true`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.current_weather) {
            setEnv((prev) => ({
              ...prev,
              weather: {
                temp: data.current_weather.temperature,
                condition: data.current_weather.weathercode?.toString() || '',
                icon: getWeatherIcon(data.current_weather.weathercode),
                location: `${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}`,
              },
            }));
          }
        })
        .catch(() => {});
    });
  }, []);

  // Update greeting on hour change
  useEffect(() => {
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 0, 0);
    const ms = next.getTime() - Date.now();
    const timer = setTimeout(() => setEnv((prev) => ({ ...prev, greeting: getGreeting() })), ms);
    return () => clearTimeout(timer);
  }, []);

  return env;
}

function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌧️';
  if (code <= 77) return '🌨️';
  return '🌈';
}
