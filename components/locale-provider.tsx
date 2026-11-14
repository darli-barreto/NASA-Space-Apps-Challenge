"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { useLanguage } from "./display-preferences";

const messages = { en, es };

export default function LocaleProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  return <NextIntlClientProvider locale={language} messages={messages[language]} timeZone="America/Lima">
    {children}
  </NextIntlClientProvider>;
}
