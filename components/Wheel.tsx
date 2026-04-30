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
  "#0e7490",
  "#155e75",
  "#1e3a8a",
  "#3730a3",
  "#0891b2",
  "#1d4ed8",
  "#0e7490",
  "#312e81",
  "#0369a1",
  "#1e40af",
];

const VIEW = 600;
const SHOW_LABELS_MAX = 40;
const SHOW_INDIVIDUAL_SLICES_MAX = 150;
const DECORATIVE_SEGMENTS = 24;

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

  const renderMode: "labeled" | "slices" | "decorative" =
    participants.length <= SHOW_LABELS_MAX
      ? "labeled"
      : participants.length <= SHOW_INDIVIDUAL_SLICES_MAX
      ? "slices"
      : "decorative";

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

  const decorativeSegments = useMemo(() => {
    const sliceAngle = 360 / DECORATIVE_SEGMENTS;
    return Array.from({ length: DECORATIVE_SEGMENTS }, (_, i) => ({
      startAngle: i * sliceAngle,
      endAngle: (i + 1) * sliceAngle,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }));
  }, []);

  useEffect(() => {
    if (!spinning || !winnerId || spinSeed === null || segments.length === 0) {
      if (!spinning) hasSpun.current = false;
      return;
    }
    if (hasSpun.current) return;
    hasSpun.current = true;

    let targetRotation: number;
    if (renderMode === "decorative") {
      // No real winner slice to align to — just spin a randomized amount
      const baseRotations = 6 + Math.floor(spinSeed * 4);
      targetRotation = baseRotations * 360 + spinSeed * 360;
    } else {
      const winnerIndex = segments.findIndex((s) => s.participant.id === winnerId);
      if (winnerIndex < 0) return;
      const sliceAngle = 360 / segments.length;
      const targetSliceMid = winnerIndex * sliceAngle + sliceAngle / 2;
      const jitter = (spinSeed - 0.5) * sliceAngle * 0.6;
      const baseRotations = 6 + Math.floor(spinSeed * 4);
      targetRotation = baseRotations * 360 + (360 - targetSliceMid) + jitter;
    }
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
  }, [spinning, winnerId, spinSeed, segments, controls, onSpinEnd, renderMode]);

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
  const r = radius - 8;

  function pathFor(startAngle: number, endAngle: number): string {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    const x1 = center + r * Math.cos(startRad);
    const y1 = center + r * Math.sin(startRad);
    const x2 = center + r * Math.cos(endRad);
    const y2 = center + r * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${center} ${center} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  return (
    <div className="relative aspect-square w-full max-w-[640px]">
      <div
        className="pointer-events-none absolute inset-[-8%] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(77,217,214,0.35) 0%, rgba(99,102,241,0.18) 40%, transparent 70%)",
        }}
      />

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

      <motion.svg
        animate={controls}
        initial={{ rotate: 0 }}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="relative h-full w-full"
        style={{ filter: "drop-shadow(0 0 40px rgba(77,217,214,0.25))" }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius - 2}
          fill="#0d1426"
          stroke="#4dd9d6"
          strokeWidth="3"
        />

        {segments.length === 1 && (
          <g>
            <circle
              cx={center}
              cy={center}
              r={r}
              fill={segments[0].color}
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
        )}

        {segments.length > 1 && renderMode === "labeled" &&
          segments.map((seg) => {
            const labelRad = (seg.midAngle - 90) * (Math.PI / 180);
            const labelX = center + labelRadius * Math.cos(labelRad);
            const labelY = center + labelRadius * Math.sin(labelRad);
            return (
              <g key={seg.participant.id}>
                <path d={pathFor(seg.startAngle, seg.endAngle)} fill={seg.color} stroke="#0d1426" strokeWidth={2} />
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
                  {truncate(seg.participant.name, maxChars)}
                </text>
              </g>
            );
          })}

        {segments.length > 1 && renderMode === "slices" &&
          segments.map((seg) => (
            <path
              key={seg.participant.id}
              d={pathFor(seg.startAngle, seg.endAngle)}
              fill={seg.color}
              stroke="#0d1426"
              strokeWidth={1}
            />
          ))}

        {renderMode === "decorative" &&
          decorativeSegments.map((seg, i) => (
            <path
              key={i}
              d={pathFor(seg.startAngle, seg.endAngle)}
              fill={seg.color}
              stroke="#0d1426"
              strokeWidth={2}
            />
          ))}

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

      {renderMode === "decorative" && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-night/80 px-3 py-1 text-[10px] uppercase tracking-widest text-brand-teal/80 backdrop-blur">
          {participants.length} kişi havuzda
        </div>
      )}
    </div>
  );
}

function truncate(name: string, max: number): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "…";
}
