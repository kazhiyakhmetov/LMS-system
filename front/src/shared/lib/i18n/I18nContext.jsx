/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ru } from "./locales/ru";
import { kk } from "./locales/kk";
import { en } from "./locales/en";

const DICTIONARIES = { ru, kk, en };
const STORAGE_KEY = "studix_lang";
const DEFAULT_LANG = "ru";

export const LANGUAGES = [
  { code: "ru", label: "Русский", short: "RU" },
  { code: "kk", label: "Қазақша", short: "KZ" },
  { code: "en", label: "English", short: "EN" },
];

const I18nContext = createContext(null);

function readStoredLang() {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && DICTIONARIES[stored]) return stored;
  } catch { /* ignore */ }
  return DEFAULT_LANG;
}

function lookup(dict, key) {
  const path = key.split(".");
  let value = dict;
  for (const segment of path) {
    if (value && typeof value === "object" && segment in value) {
      value = value[segment];
    } else {
      return undefined;
    }
  }
  return value;
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!DICTIONARIES[next]) return;
    setLangState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (key, params) => {
      const dict = DICTIONARIES[lang] || DICTIONARIES[DEFAULT_LANG];
      let value = lookup(dict, key);
      if (value === undefined && lang !== DEFAULT_LANG) {
        value = lookup(DICTIONARIES[DEFAULT_LANG], key);
      }
      if (typeof value !== "string") return key;
      if (!params) return value;
      return value.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`));
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, t, languages: LANGUAGES }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used inside I18nProvider");
  return ctx;
}
