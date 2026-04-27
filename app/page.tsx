"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import dynamic from "next/dynamic";
import ParticipantList from "@/components/ParticipantList";
import type { Participant, DrawState, StoreSnapshot } from "@/lib/store";

const Wheel = dynamic(() => import("@/components/Wheel"), { ssr: false });
const WinnerReveal = dynamic(() => import("@/components/WinnerReveal"), { ssr: false });

export default function HomePage() {
  const [snapshot, setSnapshot] = useState<StoreSnapshot>({
    state: "idle",
    participants: [],
    winner: null,
    spinSeed: null,
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
        // network hiccup, ignore
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

  return (
    <main className="min-h-screen px-8 py-8">
      <div className="mx-auto grid h-[calc(100vh-4rem)] max-w-[1800px] grid-cols-[1fr_360px] gap-8">
        <section className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] p-10 shadow-[0_20px_80px_-20px_rgba(167,139,250,0.35)] backdrop-blur-xl">
          <Header stage={stage} count={snapshot.participants.length} />
          <div className="mt-4 flex flex-1 items-center justify-center w-full">
            {stage === "qr" && <QRStage url={joinUrl} count={snapshot.participants.length} />}
            {stage !== "qr" && (
              <Wheel
                participants={snapshot.participants}
                spinning={snapshot.state === "drawing"}
                winnerId={snapshot.winner?.id ?? null}
                spinSeed={snapshot.spinSeed}
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
    <header className="text-center">
      <p className="text-xs sm:text-sm uppercase tracking-[0.4em] text-brand-accent">
        Security Day IV — {sub}
      </p>
      <h1 className="mt-2 bg-gradient-to-r from-brand-rose via-white to-brand-accent bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
        {title}
      </h1>
    </header>
  );
}

function QRStage({ url, count }: { url: string; count: number }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="rounded-3xl bg-white p-8 glow">
        {url ? (
          <QRCodeSVG value={url} size={360} level="M" />
        ) : (
          <div className="h-[360px] w-[360px]" />
        )}
      </div>
      <p className="text-center text-lg text-white/70">
        Telefonunla QR'ı okut, adını yaz, çekilişe katıl.
      </p>
      <p className="text-sm text-white/40 break-all">{url}</p>
      <div className="rounded-full bg-brand-primary/20 px-6 py-2 text-base font-semibold text-brand-accent">
        {count} kişi katıldı
      </div>
    </div>
  );
}
