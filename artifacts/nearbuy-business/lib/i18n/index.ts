import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import fr from "./locales/fr.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGS = ["fr", "en"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const STORAGE_KEY = "nearbuy_business_lang";

function pickInitial(): SupportedLang {
  try {
    const code = (Localization.getLocales()[0]?.languageCode ?? "fr").toLowerCase();
    return code.startsWith("en") ? "en" : "fr";
  } catch {
    return "fr";
  }
}

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: fr },
        en: { translation: en },
      },
      lng: pickInitial(),
      fallbackLng: "fr",
      interpolation: { escapeValue: false },
      compatibilityJSON: "v4",
      returnNull: false,
    });

  // Async: load persisted language preference and override
  AsyncStorage.getItem(STORAGE_KEY)
    .then((stored) => {
      if (stored && SUPPORTED_LANGS.includes(stored as SupportedLang)) {
        if (i18n.language !== stored) i18n.changeLanguage(stored);
      }
    })
    .catch(() => {});
}

export async function setLanguage(lang: SupportedLang): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore persistence failure
  }
}

export function getLanguage(): SupportedLang {
  return (i18n.language?.startsWith("en") ? "en" : "fr") as SupportedLang;
}

export default i18n;
