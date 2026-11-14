import type { ReactNode } from "react";

export default function ReportSection({ title, children, subsection = false }: {
  title: ReactNode;
  children: ReactNode;
  subsection?: boolean;
}) {
  const Heading = subsection ? "h3" : "h2";
  return (
    <section className="mt-6 border-t border-slate-200 pt-4">
      <Heading className={subsection ? "mb-2 text-base font-semibold" : "mb-3 text-lg font-semibold"}>{title}</Heading>
      {children}
    </section>
  );
}
