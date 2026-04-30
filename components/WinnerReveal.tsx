"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import type { Participant } from "@/lib/store";

interface WinnerRevealProps {
  winner: Participant;
  showConfetti?: boolean;
}

export default function WinnerReveal({ winner, showConfetti = true }: WinnerRevealProps) {
  useEffect(() => {
    if (!showConfetti) return;
    let cancelled = false;
    const burst = () => {
      if (cancelled) return;
      confetti({
        particleCount: 160,
        spread: 110,
        origin: { y: 0.55 },
        colors: ["#4dd9d6", "#a5f3fc", "#22d3ee", "#6366f1", "#8b5cf6", "#ecfeff"],
      });
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 65,
        origin: { x: 0, y: 0.6 },
        colors: ["#4dd9d6", "#a5f3fc", "#6366f1"],
      });
      confetti({
        particleCount: 100,
        angle: 120,
        spread: 65,
        origin: { x: 1, y: 0.6 },
        colors: ["#4dd9d6", "#a5f3fc", "#6366f1"],
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
  }, [winner.id, showConfetti]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-30 flex items-center justify-center bg-brand-night/85 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.4, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.2 }}
        className="relative px-12 py-12 text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 180 }}
          className="mx-auto mb-6 flex"
        >
          <div className="relative">
            <div className="absolute -inset-4 animate-pulse rounded-full bg-brand-teal/30 blur-2xl" />
            <div className="relative h-32 w-32 overflow-hidden rounded-full bg-brand-night ring-4 ring-brand-teal shadow-glow">
              <Image
                src="/mascot-face.jpg"
                alt=""
                fill
                sizes="128px"
                className="object-cover object-top"
              />
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xl uppercase tracking-[0.5em] text-brand-teal sm:text-2xl"
        >
          Kazanan
        </motion.p>
        <motion.h1
          initial={{ scale: 0.8 }}
          animate={{ scale: [0.8, 1.1, 1] }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-6 bg-gradient-to-r from-brand-ice via-brand-teal to-brand-cyan bg-clip-text text-6xl font-black text-transparent md:text-8xl lg:text-9xl"
          style={{
            filter: "drop-shadow(0 0 50px rgba(77, 217, 214, 0.6))",
            letterSpacing: "-0.01em",
          }}
        >
          {winner.name}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8 text-lg text-brand-ice/70"
        >
          Tebrikler!
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
