import { useEffect, useState } from "react";

const KEY = "uetcl.alarm-settings.v2";

export type AlarmSettings = {
  soundEnabled: boolean;
  volume: number;
  recipients: string[];
};

const DEFAULTS: AlarmSettings = {
  soundEnabled: true,
  volume: 0.7,
  recipients: [
    "operator1@uetcl.com",
    "operator2@uetcl.com",
    "supervisor@uetcl.com",
    "manager@uetcl.com",
    "cto@uetcl.com",
  ],
};

function read(): AlarmSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AlarmSettings>) };
  } catch {
    return DEFAULTS;
  }
}

const listeners = new Set<(s: AlarmSettings) => void>();
let current: AlarmSettings | null = null;

export function useAlarmSettings() {
  const [settings, setSettings] = useState<AlarmSettings>(() => {
    if (!current) current = read();
    return current;
  });

  useEffect(() => {
    const l = (s: AlarmSettings) => setSettings(s);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const update = (patch: Partial<AlarmSettings>) => {
    const next = { ...(current ?? DEFAULTS), ...patch };
    current = next;
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    listeners.forEach((l) => l(next));
  };

  return { settings, update };
}

export function getAlarmSettingsSnapshot(): AlarmSettings {
  if (!current) current = read();
  return current;
}
