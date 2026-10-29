"use client";

import { useTranslation } from "@/lib/i18n/client";
import { isAfter, subYears } from "date-fns";

export default function BookmarkFormattedCreatedAt(prop: { createdAt: Date }) {
  const { i18n } = useTranslation();
  const createdAt = prop.createdAt;
  const language = i18n.resolvedLanguage ?? "zh";
  const locale = language === "zhtw" ? "zh-TW" : language.replace("_", "-");
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    ...(isAfter(createdAt, subYears(new Date(), 1))
      ? {}
      : { year: "numeric" as const }),
  }).format(createdAt);
}
