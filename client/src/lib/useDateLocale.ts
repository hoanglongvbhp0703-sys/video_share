import { useTranslation } from "react-i18next";
import { vi } from "date-fns/locale";
import { enUS } from "date-fns/locale";
import { ja } from "date-fns/locale";

export function useDateLocale() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  if (lang === "en") return enUS;
  if (lang === "ja") return ja;
  return vi;
}
