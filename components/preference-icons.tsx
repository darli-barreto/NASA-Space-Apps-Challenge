export function Flag({ language }: { language: "en" | "es" }) {
  return language === "en" ? (
    <svg aria-hidden="true" viewBox="0 0 28 18" className="h-4 w-6 shrink-0 rounded-xs">
      <path fill="#fff" d="M0 0h28v18H0z" />
      <path stroke="#b31942" strokeWidth="1.4" d="M0 .7h28M0 3.47h28M0 6.24h28M0 9h28M0 11.77h28M0 14.54h28M0 17.3h28" />
      <path fill="#263c78" d="M0 0h12v9.7H0z" />
      <path stroke="#fff" strokeWidth=".85" strokeLinecap="round" strokeDasharray="0 2" d="M2 2h9M1 4h10M2 6h9M1 8h10" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 28 18" className="h-4 w-6 shrink-0 rounded-xs">
      <path fill="#aa151b" d="M0 0h28v18H0z" />
      <path fill="#f1bf00" d="M0 4.5h28v9H0z" />
      <path fill="#aa151b" d="M7.5 7.1h4v3.3l-2 1.1-2-1.1z" />
      <path stroke="#fff" strokeWidth=".6" d="M9.5 7.2v3.5m-1.8-1.8h3.6" />
    </svg>
  );
}

export function ThemeIcon({ theme }: { theme: "light" | "dark" | "system" }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {theme === "light" && <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}
    {theme === "dark" && <path d="M20.8 14A9 9 0 0 1 10 3.2 9 9 0 1 0 20.8 14Z" />}
    {theme === "system" && <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M12 17v4m-4 0h8" /></>}
  </svg>;
}
