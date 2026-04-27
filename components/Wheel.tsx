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
  size?: number;
}

const PALETTE = [
  "#7c3aed", "#06b6d4", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#8b5cf6",
  "#14b8a6", "#f97316",
];

export default function Wheel({
  participants,
  spinning,
  winnerId,
  spinSeed,
  onSpinEnd,
  size = 560,
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
      color: PALETTE[i % PALETTE.length],
    }));
  }, [participants]);

  useEffect(() => {
    if (!spinning || !winnerId || spinSeed === null || segments.length === 0) {
      if (!spinning) {
        hasSpun.current = false;
      }
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
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-full border-4 border-dashed border-white/20 text-white/40"
      >
        Katılımcı bekleniyor…
      </div>
    );
  }

  const radius = size / 2;
  const center = radius;
  const labelRadius = radius * 0.65;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute z-20 -translate-x-1/2"
        style={{ left: "50%", top: -8 }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "22px solid transparent",
            borderRight: "22px solid transparent",
            borderTop: "36px solid #fbbf24",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
          }}
        />
      </div>

      <motion.svg
        animate={controls}
        initial={{ rotate: 0 }}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-[0_0_60px_rgba(124,58,237,0.4)]"
      >
        {segments.map((seg) => {
          const startRad = (seg.startAngle - 90) * (Math.PI / 180);
          const endRad = (seg.endAngle - 90) * (Math.PI / 180);
          const x1 = center + radius * Math.cos(startRad);
          const y1 = center + radius * Math.sin(startRad);
          const x2 = center + radius * Math.cos(endRad);
          const y2 = center + radius * Math.sin(endRad);
          const largeArc = seg.endAngle - seg.startAngle > 180 ? 1 : 0;

          const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

          const labelRad = (seg.midAngle - 90) * (Math.PI / 180);
          const labelX = center + labelRadius * Math.cos(labelRad);
          const labelY = center + labelRadius * Math.sin(labelRad);

          const fontSize = Math.max(10, Math.min(18, 280 / Math.max(8, segments.length)));
          const maxChars = Math.max(8, Math.floor(40 / Math.max(1, segments.length / 6)));
          const display = truncate(seg.participant.name, maxChars);

          return (
            <g key={seg.participant.id}>
              <path d={path} fill={seg.color} stroke="#0a0a14" strokeWidth={2} />
              <text
                x={labelX}
                y={labelY}
                fill="#fff"
                fontSize={fontSize}
                fontWeight={600}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${seg.midAngle}, ${labelX}, ${labelY})`}
                style={{ pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
              >
                {display}
              </text>
            </g>
          );
        })}
        <circle
          cx={center}
          cy={center}
          r={radius * 0.12}
          fill="#0a0a14"
          stroke="#fbbf24"
          strokeWidth={4}
        />
      </motion.svg>
    </div>
  );
}

function truncate(name: string, max: number): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "…";
}
