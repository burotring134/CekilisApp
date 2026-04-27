"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Participant } from "@/lib/store";

interface ParticipantListProps {
  participants: Participant[];
  highlightId?: string | null;
}

export default function ParticipantList({ participants, highlightId }: ParticipantListProps) {
  return (
    <aside className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <header className="flex items-baseline justify-between border-b border-white/10 pb-4">
        <h2 className="text-lg font-semibold">Katılımcılar</h2>
        <span className="rounded-full bg-brand-primary/20 px-3 py-1 text-sm font-bold text-brand-accent">
          {participants.length}
        </span>
      </header>
      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        {participants.length === 0 ? (
          <p className="text-sm text-white/50">Henüz katılan yok.</p>
        ) : (
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {participants.map((p, idx) => {
                const isWinner = highlightId === p.id;
                return (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      isWinner
                        ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-6 text-xs text-white/40">{idx + 1}</span>
                      <span className="font-medium">{p.name}</span>
                    </span>
                    {isWinner && <span className="text-xs font-bold">★ KAZANAN</span>}
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
