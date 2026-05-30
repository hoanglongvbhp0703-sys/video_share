import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import vi from "@/locales/vi";
import en from "@/locales/en";
import ja from "@/locales/ja";

const LANG_KEY = "vs_lang";

export type Language = "vi" | "en" | "ja";

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
];

const savedLang = (localStorage.getItem(LANG_KEY) as Language) || "ja";

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
    ja: { translation: ja },
  },
  lng: savedLang,
  fallbackLng: "ja",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(LANG_KEY, lng);
});

export default i18n;
