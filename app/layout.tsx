import LocaleProvider from "@/components/locale-provider";
import { DisplayPreferences } from "@/components/display-preferences";
import type { Metadata } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import { projectName } from "@/lib/project-identity";
import Workspace from "@/components/workspace";
import "./globals.css";

const fira = localFont({
  src: [
    { path: "./fonts/FiraSans-normal-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/FiraSans-normal-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/FiraSans-normal-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/FiraSans-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
export const metadata: Metadata = {
  title: `TERRA · ${projectName}`,
  description: "Assess potential terrestrial analogs with open data and traceable evidence.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fira.className}>
      <body className={[
        "bg-[#f6f7f9]",
        "text-base",
        "text-black",
        "[[data-dark]_&]:bg-slate-950",
        "[[data-dark]_&]:text-slate-100",
        "[[data-dark]_&]:[color-scheme:dark]",
        "[[data-dark]_&]:[&_.bg-white]:bg-slate-900",
        "[[data-dark]_&]:[&_.bg-slate-50]:bg-slate-800",
        "[[data-dark]_&]:[&_.bg-slate-100]:bg-slate-800",
        "[[data-dark]_&]:[&_.bg-sky-50]:bg-slate-800",
        "[[data-dark]_&]:[&_.text-black]:text-slate-100",
        "[[data-dark]_&]:[&_a.underline]:text-sky-300",
        "[[data-dark]_&]:[&_.border-slate-200]:border-slate-700",
        "[[data-dark]_&]:[&_.border-slate-300]:border-slate-600",
        "[[data-dark]_&]:[&_select]:border-slate-500",
        "[[data-dark]_&]:[&_select]:bg-slate-900",
        "[[data-dark]_&]:[&_select]:text-slate-100",
        "[[data-dark]_&]:[&_option]:bg-slate-900",
        "[[data-dark]_&]:[&_option]:text-slate-100",
        "[&_button:enabled]:cursor-pointer",
        "[&_button:disabled]:opacity-45",
        "[&_:focus-visible]:outline-2",
        "[&_:focus-visible]:outline-offset-2",
        "[&_:focus-visible]:outline-[#0042A6]",
      ].join(" ")}>
        <DisplayPreferences />
        <LocaleProvider><Suspense fallback={null}><Workspace>{children}</Workspace></Suspense></LocaleProvider>
      </body>
    </html>
  );
}
