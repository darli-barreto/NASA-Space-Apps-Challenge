"use client";

import { useEffect, useSyncExternalStore } from "react";

type Language = "es" | "en";
type Theme = "light" | "dark" | "system";
const eventName = "terra-preferences";

function read(key: string, fallback: string) {
  try { return localStorage.getItem(key) ?? fallback; }
  catch { return fallback; }
}

function write(key: string, value: string) {
  try { localStorage.setItem(key, value); }
  catch { return; }
  window.dispatchEvent(new Event(eventName));
}

function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", listener);
  };
}

export function useLanguage() {
  const language = useSyncExternalStore<Language>(subscribe, () => read("terra-language", "en") === "es" ? "es" : "en", () => "en");
  return { language, setLanguage: (value: Language) => write("terra-language", value),
    t: (es: string, en: string) => language === "en" ? en : es };
}

export function useTheme() {
  const theme = useSyncExternalStore<Theme>(subscribe, () => {
    const value = read("terra-theme", "system");
    return value === "dark" || value === "light" ? value : "system";
  }, () => "system");
  return { theme, setTheme: (value: Theme) => write("terra-theme", value) };
}

export function DisplayPreferences() {
  const { language } = useLanguage();
  const { theme } = useTheme();
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    const system = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && system.matches);
      document.documentElement.toggleAttribute("data-dark", dark);
    };
    apply();
    system.addEventListener("change", apply);
    return () => system.removeEventListener("change", apply);
  }, [theme]);
  return null;
}
