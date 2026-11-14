import type { ReactNode } from "react";

export const primaryActionClass = "inline-flex min-h-11 items-center justify-center rounded bg-[#e7f434] px-2 text-base font-medium text-[#1b1b1b] hover:text-white hover:bg-[#0050d8] sm:px-4";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={`mb-4 min-w-0 border border-slate-200 bg-white p-5${className ? ` ${className}` : ""}`}>{children}</section>;
}

export function Heading({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {description && <p className="my-2 text-sm leading-relaxed text-black">{description}</p>}
    </div>
    {action}
  </div>;
}
