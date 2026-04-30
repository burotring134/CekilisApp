"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Participant } from "@/lib/store";

interface ParticipantListProps {
  participants: Participant[];
  highlightId?: string | null;
  pastWinnerIds?: string[];
}

export default function ParticipantList({
  participants,
  highlightId,
  pastWinnerIds = [],
}: ParticipantListProps) {
  const pastSet = new Set(pastWinnerIds);
  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-3xl border border-brand-teal/20 bg-brand-card/50 p-6 backdrop-blur-xl">
      <header className="flex items-baseline justify-between border-b border-brand-teal/15 pb-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-brand-teal shadow-[0_0_10px_rgba(77,217,214,0.8)]" />
          <h2 className="text-base font-semibold tracking-wide text-brand-ice">
            Katılımcılar
          </h2>
        </div>
        <span className="rounded-full border border-brand-teal/30 bg-brand-teal/10 px-3 py-1 text-sm font-bold text-brand-teal">
          {participants.length}
        </span>
      </header>
      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        {participants.length === 0 ? (
          <p className="mt-6 text-center text-sm text-brand-ice/40">
            Henüz katılan yok…
          </p>
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {participants.map((p, idx) => {
                const isCurrentWinner = highlightId === p.id;
                const wonBefore = pastSet.has(p.id);
                return (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
                      isCurrentWinner
                        ? "border border-brand-teal bg-brand-teal/15 text-brand-ice shadow-glow-sm"
                        : wonBefore
                        ? "border border-amber-300/20 bg-amber-300/5 text-brand-ice/60"
                        : "border border-transparent hover:border-brand-teal/20 hover:bg-brand-teal/5"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold ${
                          isCurrentWinner
                            ? "bg-brand-teal text-brand-night"
                            : wonBefore
                            ? "bg-amber-300/20 text-amber-200"
                            : "bg-brand-ink text-brand-ice/50"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className={`font-medium ${wonBefore && !isCurrentWinner ? "line-through" : ""}`}>
                        {p.name}
                      </span>
                    </span>
                    {isCurrentWinner ? (
                      <span className="rounded-full bg-brand-teal px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-night">
                        ★ Kazanan
                      </span>
                    ) : wonBefore ? (
                      <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                        Kazandı
                      </span>
                    ) : null}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </aside>
  );
}
