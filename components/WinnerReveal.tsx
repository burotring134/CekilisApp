"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import type { Participant } from "@/lib/store";

interface WinnerRevealProps {
  winner: Participant;
}

export default function WinnerReveal({ winner }: WinnerRevealProps) {
  useEffect(() => {
    let cancelled = false;
    const burst = () => {
      if (cancelled) return;
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.55 },
        colors: ["#7c3aed", "#06b6d4", "#fbbf24", "#ec4899", "#10b981"],
      });
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.6 },
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.6 },
      });
    };
    burst();
    const i1 = setTimeout(burst, 700);
    const i2 = setTimeout(burst, 1500);
    const i3 = setTimeout(burst, 2500);
    return () => {
      cancelled = true;
      clearTimeout(i1);
      clearTimeout(i2);
      clearTimeout(i3);
    };
  }, [winner.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.4, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.2 }}
        className="relative px-12 py-16 text-center"
      >
        <motion.p
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-2xl uppercase tracking-[0.4em] text-brand-accent"
        >
          Kazanan
        </motion.p>
        <motion.h1
          initial={{ scale: 0.8 }}
          animate={{ scale: [0.8, 1.1, 1] }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-6 bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-300 bg-clip-text text-7xl font-black text-transparent md:text-9xl"
          style={{
            filter: "drop-shadow(0 0 40px rgba(251, 191, 36, 0.5))",
          }}
        >
          {winner.name}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8 text-lg text-white/70"
        >
          🎉 Tebrikler! 🎉
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
