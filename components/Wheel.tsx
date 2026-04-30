"use client";

import { motion, useAnimation } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import type { Participant } from "@/lib/store";

interface WheelProps {
  participants: Participant[];
  spinning: boolean;
  winnerId: string | null;
  spinSeed: number | null;
  onSpinEnd?: () => void;
}

const SLICE_COLORS = [
  "#0e7490", // cyan-700 deep
  "#155e75", // cyan-800 darker
  "#1e3a8a", // indigo deep
  "#3730a3", // indigo dark
  "#0891b2", // cyan-600
  "#1d4ed8", // blue-700
  "#0e7490",
  "#312e81", // indigo-900
  "#0369a1", // sky-700
  "#1e40af",
];

const VIEW = 600;

export default function Wheel({
  participants,
  spinning,
  winnerId,
  spinSeed,
  onSpinEnd,
}: WheelProps) {
  const controls = useAnimation();
  const lastRotation = useRef(0);
  const hasSpun = useRef(false);

  const segments = useMemo(() => {
    if (participants.length === 0) return [];
    const sliceAngle = 360 / participants.length;
    return participants.map((p, i) => ({
      participant: p,
      startAngle: i * sliceAngle,
      endAngle: (i + 1) * sliceAngle,
      midAngle: i * sliceAngle + sliceAngle / 2,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }));
  }, [participants]);

  useEffect(() => {
    if (!spinning || !winnerId || spinSeed === null || segments.length === 0) {
      if (!spinning) hasSpun.current = false;
      return;
    }
    if (hasSpun.current) return;
    hasSpun.current = true;

    const winnerIndex = segments.findIndex((s) => s.participant.id === winnerId);
    if (winnerIndex < 0) return;

    const sliceAngle = 360 / segments.length;
    const targetSliceMid = winnerIndex * sliceAngle + sliceAngle / 2;
    const jitter = (spinSeed - 0.5) * sliceAngle * 0.6;
    const baseRotations = 6 + Math.floor(spinSeed * 4);
    const targetRotation = baseRotations * 360 + (360 - targetSliceMid) + jitter;
    const finalRotation = lastRotation.current + targetRotation;

    controls
      .start({
        rotate: finalRotation,
        transition: { duration: 6, ease: [0.17, 0.67, 0.21, 0.99] },
      })
      .then(() => {
        lastRotation.current = finalRotation;
        onSpinEnd?.();
      });
  }, [spinning, winnerId, spinSeed, segments, controls, onSpinEnd]);

  if (segments.length === 0) {
    return (
      <div className="flex aspect-square w-full max-w-[560px] items-center justify-center rounded-full border-4 border-dashed border-brand-teal/30 text-brand-ice/40">
        Katılımcı bekleniyor…
      </div>
    );
  }

  const radius = VIEW / 2;
  const center = radius;
  const labelRadius = radius * 0.68;
  const fontSize = Math.max(11, Math.min(20, 320 / Math.max(8, segments.length)));
  const maxChars = Math.max(8, Math.floor(40 / Math.max(1, segments.length / 6)));
  const hubRadius = radius * 0.22;

  return (
    <div className="relative aspect-square w-full max-w-[640px]">
      {/* Outer halo glow */}
      <div
        className="pointer-events-none absolute inset-[-8%] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(77,217,214,0.35) 0%, rgba(99,102,241,0.18) 40%, transparent 70%)",
        }}
      />

      {/* Pointer */}
      <div
        className="pointer-events-none absolute z-30 -translate-x-1/2"
        style={{ left: "50%", top: "-3%" }}
      >
        <svg width="64" height="68" viewBox="0 0 64 68">
          <defs>
            <linearGradient id="pointerGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a5f3fc" />
              <stop offset="1" stopColor="#0891b2" />
            </linearGradient>
          </defs>
          <path
            d="M32 60 L6 8 L58 8 Z"
            fill="url(#pointerGrad)"
            stroke="#0d1426"
            strokeWidth="3"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 6px 20px rgba(77,217,214,0.6))" }}
          />
          <circle cx="32" cy="20" r="3" fill="#0d1426" />
        </svg>
      </div>

      {/* Wheel */}
      <motion.svg
        animate={controls}
        initial={{ rotate: 0 }}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="relative h-full w-full"
        style={{ filter: "drop-shadow(0 0 40px rgba(77,217,214,0.25))" }}
      >
        <defs>
          {segments.map((seg, i) => (
            <radialGradient key={`g-${i}`} id={`slice-${i}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={seg.color} stopOpacity="1" />
              <stop offset="100%" stopColor={seg.color} stopOpacity="0.8" />
            </radialGradient>
          ))}
        </defs>

        {/* Outer ring */}
        <circle cx={center} cy={center} r={radius - 2} fill="#0d1426" stroke="#4dd9d6" strokeWidth="3" />

        {segments.length === 1 ? (
          <g>
            <circle
              cx={center}
              cy={center}
              r={radius - 8}
              fill={`url(#slice-0)`}
              stroke="#0d1426"
              strokeWidth={3}
            />
            <text
              x={center}
              y={center - radius * 0.35}
              fill="#ecfeff"
              fontSize={fontSize * 1.6}
              fontWeight={800}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ pointerEvents: "none", letterSpacing: "0.02em" }}
            >
              {truncate(segments[0].participant.name, 20)}
            </text>
          </g>
        ) : (
          segments.map((seg, i) => {
            const startRad = (seg.startAngle - 90) * (Math.PI / 180);
            const endRad = (seg.endAngle - 90) * (Math.PI / 180);
            const r = radius - 8;
            const x1 = center + r * Math.cos(startRad);
            const y1 = center + r * Math.sin(startRad);
            const x2 = center + r * Math.cos(endRad);
            const y2 = center + r * Math.sin(endRad);
            const largeArc = seg.endAngle - seg.startAngle > 180 ? 1 : 0;
            const path = `M ${center} ${center} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

            const labelRad = (seg.midAngle - 90) * (Math.PI / 180);
            const labelX = center + labelRadius * Math.cos(labelRad);
            const labelY = center + labelRadius * Math.sin(labelRad);
            const display = truncate(seg.participant.name, maxChars);

            return (
              <g key={seg.participant.id}>
                <path d={path} fill={`url(#slice-${i})`} stroke="#0d1426" strokeWidth={2} />
                <text
                  x={labelX}
                  y={labelY}
                  fill="#ecfeff"
                  fontSize={fontSize}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${seg.midAngle}, ${labelX}, ${labelY})`}
                  style={{
                    pointerEvents: "none",
                    textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {display}
                </text>
              </g>
            );
          })
        )}

        {/* Inner accent ring */}
        <circle
          cx={center}
          cy={center}
          r={hubRadius + 6}
          fill="none"
          stroke="#4dd9d6"
          strokeWidth={3}
          opacity={0.8}
        />
      </motion.svg>

      {/* Mascot at center (does NOT rotate with wheel) */}
      <div
        className="pointer-events-none absolute z-20 flex items-center justify-center rounded-full bg-brand-night ring-4 ring-brand-teal"
        style={{
          left: "50%",
          top: "50%",
          width: `${(hubRadius * 2 * 100) / VIEW}%`,
          height: `${(hubRadius * 2 * 100) / VIEW}%`,
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 30px rgba(77,217,214,0.6), inset 0 0 20px rgba(77,217,214,0.15)",
        }}
      >
        <div className="relative h-[88%] w-[88%] overflow-hidden rounded-full">
          <Image
            src="/mascot-face.jpg"
            alt="Maskot"
            fill
            sizes="200px"
            className="object-cover object-top"
            priority
          />
        </div>
      </div>
    </div>
  );
}

function truncate(name: string, max: number): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "…";
}
