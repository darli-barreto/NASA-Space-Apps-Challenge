"use client";

import { useTranslations } from "next-intl";
import type { MessageKey } from "@/lib/messages";

export function Message({ id }: { id: MessageKey }) {
  const t = useTranslations();
  return t(id);
}
