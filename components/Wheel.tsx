"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import type { Participant } from "@/lib/store";

interface WheelProps {
  participants: Participant[];
  spinning: boolean;
  winnerId: string | null;
  spinSeed: number | null;
  onSpinEnd?: () => void;
}

const PASTEL = [
  "#fbcfe8", // pink
  "#bae6fd", // sky
  "#bbf7d0", // mint
  "#fef3c7", // butter
  "#ddd6fe", // lavender
  "#fecaca", // rose
  "#a7f3d0", // seafoam
  "#fed7aa", // peach
  "#e9d5ff", // lilac
  "#bfdbfe", // baby blue
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
      color: PASTEL[i % PASTEL.length],
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
      <div className="flex aspect-square w-full max-w-[560px] items-center justify-center rounded-full border-4 border-dashed border-white/20 text-white/40">
        Katılımcı bekleniyor…
      </div>
    );
  }

  const radius = VIEW / 2;
  const center = radius;
  const labelRadius = radius * 0.62;
  const fontSize = Math.max(11, Math.min(22, 320 / Math.max(8, segments.length)));
  const maxChars = Math.max(8, Math.floor(40 / Math.max(1, segments.length / 6)));

  return (
    <div className="relative aspect-square w-full max-w-[620px]">
      <div
        className="pointer-events-none absolute z-20 -translate-x-1/2"
        style={{ left: "50%", top: "-2%" }}
      >
        <svg width="56" height="56" viewBox="0 0 56 56">
          <path
            d="M28 50 L8 8 L48 8 Z"
            fill="#fde68a"
            stroke="#92400e"
            strokeWidth="2"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.4))" }}
          />
        </svg>
      </div>

      <motion.svg
        animate={controls}
        initial={{ rotate: 0 }}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="h-full w-full drop-shadow-[0_0_60px_rgba(221,214,254,0.35)]"
      >
        <circle cx={center} cy={center} r={radius - 1} fill="#1e1b4b" />

        {segments.length === 1 ? (
          <g>
            <circle
              cx={center}
              cy={center}
              r={radius - 6}
              fill={segments[0].color}
              stroke="#1e1b4b"
              strokeWidth={3}
            />
            <text
              x={center}
              y={center - labelRadius * 0.4}
              fill="#1e1b4b"
              fontSize={fontSize * 1.5}
              fontWeight={800}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ pointerEvents: "none" }}
            >
              {truncate(segments[0].participant.name, 20)}
            </text>
          </g>
        ) : (
          segments.map((seg) => {
            const startRad = (seg.startAngle - 90) * (Math.PI / 180);
            const endRad = (seg.endAngle - 90) * (Math.PI / 180);
            const r = radius - 6;
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
                <path d={path} fill={seg.color} stroke="#1e1b4b" strokeWidth={2} />
                <text
                  x={labelX}
                  y={labelY}
                  fill="#1e1b4b"
                  fontSize={fontSize}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${seg.midAngle}, ${labelX}, ${labelY})`}
                  style={{ pointerEvents: "none" }}
                >
                  {display}
                </text>
              </g>
            );
          })
        )}

        <circle
          cx={center}
          cy={center}
          r={radius - 4}
          fill="none"
          stroke="#fef3c7"
          strokeWidth={6}
          opacity={0.9}
        />

        <circle
          cx={center}
          cy={center}
          r={radius * 0.1}
          fill="#fef3c7"
          stroke="#92400e"
          strokeWidth={3}
        />
        <circle cx={center} cy={center} r={radius * 0.04} fill="#92400e" />
      </motion.svg>
    </div>
  );
}

function truncate(name: string, max: number): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "…";
}
