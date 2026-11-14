import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

export default function CandidateSearchProgress({ processed, total, pause }: {
  processed: number;
  total: number;
  pause: () => void;
}) {
  const translate = useTranslations();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const overlay = dialog.current;
    if (!overlay) return;
    overlay.showModal();
    return () => overlay.close();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="candidate-search-title"
      onCancel={event => { event.preventDefault(); pause(); }}
      className="m-auto w-[min(17rem,calc(100%-2rem))] bg-transparent p-3 text-center text-white backdrop:bg-gray-700/45 backdrop:backdrop-blur-xs">
      <div aria-hidden="true" className="relative mx-auto mb-6 grid size-36 place-items-center">
        <div className="relative size-20 overflow-hidden rounded-full bg-radial-[at_33%_27%] from-slate-100 via-slate-400 to-[#ffffff] shadow-sm">
          <span className="absolute left-4 top-5 size-5 rounded-full bg-slate-600/20 shadow-inner" />
          <span className="absolute right-3 top-8 size-3 rounded-full bg-slate-700/25 shadow-inner" />
          <span className="absolute bottom-3 left-7 size-3.5 rounded-full bg-slate-600/30 shadow-inner" />
        </div>
        <div className="absolute inset-1 rounded-full border border-[#1b2b85]/25" />
        <div className="absolute inset-1 motion-safe:animate-[spin_2.8s_linear_infinite]">
          <span className="absolute left-1/2 top-0 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[#0042A6] shadow-sm" />
        </div>
      </div>
      <h2 id="candidate-search-title" className="text-base font-semibold">{translate("searchingForCandidates")}</h2>
      <progress aria-label={translate("searchProgress")} max={total || 1}
        value={total > 0 ? processed : undefined}
        className="mx-auto mt-3 block h-2 w-44 overflow-hidden rounded-full bg-slate-200 text-[#0042A6] accent-[#0042A6] [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-[#0042A6] [&::-moz-progress-bar]:bg-[#0042A6]" />
      <p aria-hidden={total === 0} className="mt-2 min-h-5 text-xs tabular-nums">
        {total > 0 && `${processed} / ${total}`}
      </p>
      <button type="button" onClick={pause} className="mt-1 min-h-11 rounded px-4 text-sm underline underline-offset-4 hover:bg-slate-200/70">
        {translate("pause")}
      </button>
    </dialog>
  );
}
