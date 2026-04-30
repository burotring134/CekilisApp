"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import dynamic from "next/dynamic";
import Image from "next/image";
import ParticipantList from "@/components/ParticipantList";
import type { StoreSnapshot } from "@/lib/store";

const Wheel = dynamic(() => import("@/components/Wheel"), { ssr: false });
const WinnerReveal = dynamic(() => import("@/components/WinnerReveal"), { ssr: false });

export default function HomePage() {
  const [snapshot, setSnapshot] = useState<StoreSnapshot>({
    state: "idle",
    participants: [],
    winner: null,
    spinSeed: null,
    pastWinnerIds: [],
  });
  const [joinUrl, setJoinUrl] = useState("");
  const [showWinner, setShowWinner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setJoinUrl(`${window.location.origin}/join`);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        const data = (await res.json()) as StoreSnapshot;
        if (!cancelled) setSnapshot(data);
      } catch {
        // network hiccup
      }
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (snapshot.state === "finished" && snapshot.winner) {
      setShowWinner(true);
    } else {
      setShowWinner(false);
    }
  }, [snapshot.state, snapshot.winner]);

  const stage: "qr" | "wheel" | "winner" = useMemo(() => {
    if (snapshot.state === "finished") return "winner";
    if (snapshot.state === "drawing") return "wheel";
    return "qr";
  }, [snapshot.state]);

  const handleSpinEnd = async () => {
    try {
      await fetch("/api/draw", { method: "PATCH", cache: "no-store" });
    } catch {
      // ignore — admin can still press "Sonucu Göster" manually
    }
  };

  return (
    <main className="min-h-screen px-6 py-6 lg:px-10 lg:py-8">
      <div className="mx-auto grid h-[calc(100vh-3rem)] max-w-[1800px] grid-cols-1 gap-6 lg:h-[calc(100vh-4rem)] lg:grid-cols-[1fr_380px] lg:gap-8">
        <section className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-brand-teal/20 bg-brand-card/40 p-8 backdrop-blur-xl">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(77,217,214,0.12) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(99,102,241,0.12) 0%, transparent 50%)",
            }}
          />
          <Header stage={stage} count={snapshot.participants.length} />
          <div className="relative mt-6 flex w-full flex-1 items-center justify-center">
            {stage === "qr" && <QRStage url={joinUrl} count={snapshot.participants.length} />}
            {stage !== "qr" && (
              <Wheel
                participants={snapshot.participants}
                spinning={snapshot.state === "drawing"}
                winnerId={snapshot.winner?.id ?? null}
                spinSeed={snapshot.spinSeed}
                onSpinEnd={handleSpinEnd}
              />
            )}
          </div>
        </section>

        <ParticipantList
          participants={snapshot.participants}
          highlightId={snapshot.state === "finished" ? snapshot.winner?.id : null}
        />
      </div>

      {showWinner && snapshot.winner && <WinnerReveal winner={snapshot.winner} />}
    </main>
  );
}

function Header({ stage, count }: { stage: "qr" | "wheel" | "winner"; count: number }) {
  const labels: Record<typeof stage, { sub: string; title: string }> = {
    qr: { sub: "Katılım açık", title: "QR kodu okutarak katıl" },
    wheel: { sub: "Çekiliş başladı", title: `Şanslı isim aranıyor… (${count} kişi)` },
    winner: { sub: "Tamamlandı", title: "Kazanan belirlendi" },
  };
  const { sub, title } = labels[stage];
  return (
    <header className="relative z-10 flex items-center gap-4">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-brand-night ring-2 ring-brand-teal/60 shadow-glow-sm">
        <Image src="/mascot-face.jpg" alt="" fill sizes="56px" className="object-cover object-top" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.4em] text-brand-teal sm:text-xs">
          Security Day IV · {sub}
        </p>
        <h1 className="mt-1 bg-gradient-to-r from-brand-ice via-brand-teal to-brand-cyan bg-clip-text text-2xl font-bold text-transparent sm:text-3xl lg:text-4xl">
          {title}
        </h1>
      </div>
    </header>
  );
}

function QRStage({ url, count }: { url: string; count: number }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-teal/30 via-brand-indigo/20 to-brand-violet/20 blur-2xl" />
        <div className="relative rounded-3xl bg-white p-7 glow ring-4 ring-brand-teal/40">
          {url ? (
            <QRCodeSVG value={url} size={340} level="M" fgColor="#050810" bgColor="#ffffff" />
          ) : (
            <div className="h-[340px] w-[340px]" />
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-lg font-medium text-brand-ice">
          Telefonunla QR'ı okut, çekilişe katıl
        </p>
        <p className="text-xs text-brand-ice/40 break-all">{url}</p>
      </div>
      <div className="flex items-center gap-3 rounded-full border border-brand-teal/30 bg-brand-teal/10 px-6 py-2.5 backdrop-blur">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-teal opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-teal" />
        </span>
        <span className="text-sm font-semibold text-brand-ice">
          {count} kişi katıldı
        </span>
      </div>
    </div>
  );
}
