import { useRef, type ReactNode } from "react";

export default function PreferenceMenu<T extends string>({ label, value, items, choose }: {
  label: string;
  value: T;
  items: { value: T; label: string; icon: ReactNode; lang?: string }[];
  choose: (value: T) => void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const selected = items.find(item => item.value === value);
  return <details ref={details} className="relative text-white"
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}
    onKeyDown={event => {
      if (event.key !== "Escape" || !event.currentTarget.open) return;
      event.stopPropagation();
      event.currentTarget.open = false;
      summary.current?.focus();
    }}>
    <summary ref={summary} aria-label={`${label}: ${selected?.label ?? ""}`}
      className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-1 rounded border border-white/40 px-2 focus-visible:outline-white [&::-webkit-details-marker]:hidden">
      {selected?.icon}<span aria-hidden="true" className="text-xs">▾</span>
    </summary>
    <div role="group" aria-label={label} className="absolute right-0 z-40 mt-1 min-w-36 rounded border border-white/30 bg-[#1b2b85] p-1 shadow-lg">
      {items.map(item => <button key={item.value} type="button" lang={item.lang} aria-pressed={value === item.value}
        className="flex min-h-10 w-full items-center gap-2 rounded px-2 text-left text-sm hover:bg-white/10 aria-pressed:bg-white/20"
        onClick={() => {
          choose(item.value);
          if (details.current) details.current.open = false;
          summary.current?.focus();
        }}>
        {item.icon}{item.label}
      </button>)}
    </div>
  </details>;
}
