import type en from "@/messages/en.json";

export type MessageKey = keyof typeof en;

declare module "next-intl" {
  interface AppConfig {
    Locale: "en" | "es";
    Messages: typeof en;
  }
}
