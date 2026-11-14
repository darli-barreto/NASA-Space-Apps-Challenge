"use client";

import { useTranslations } from "next-intl";
import sourceKeys from "@/messages/source-keys.json";
import type { MessageKey } from "@/lib/messages";

export function useSourceText() {
  const t = useTranslations();
  return (value: string) => {
    const key = Object.hasOwn(sourceKeys, value) ? sourceKeys[value as keyof typeof sourceKeys] as MessageKey : undefined;
    return key ? t(key) : value;
  };
}

export default function SourceText({ value }: { value: string }) {
  return useSourceText()(value);
}
