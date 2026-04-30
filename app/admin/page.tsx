"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { StoreSnapshot } from "@/lib/store";

const PASSWORD_STORAGE = "raffle-admin-pw-v1";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [snapshot, setSnapshot] = useState<StoreSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem(PASSWORD_STORAGE);
    if (saved) {
      setPassword(saved);
      verify(saved);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        const data = (await res.json()) as StoreSnapshot;
        if (!cancelled) setSnapshot(data);
      } catch {
        // ignore
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [authed]);

  async function verify(pw: string) {
    setAuthError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "x-admin-password": pw },
      });
      if (res.ok) {
        setAuthed(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(PASSWORD_STORAGE, pw);
        }
      } else {
        setAuthed(false);
        setAuthError("Yanlış şifre.");
      }
    } catch {
      setAuthError("Sunucuya ulaşılamadı.");
    }
  }

  async function startDraw() {
    if (!confirm("Çekiliş başlatılsın mı? Yeni katılım kapanacak.")) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/draw", {
        method: "POST",
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (!data.ok) {
        setMessage(`Hata: ${data.reason}`);
      } else {
        setMessage(
          `Çekiliş başladı. Kazanan: ${data.winner.name} (animasyon bittikten sonra "Sonucu Göster"e bas)`
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function revealWinner() {
    setBusy(true);
    try {
      await fetch("/api/draw", {
        method: "PATCH",
        headers: { "x-admin-password": password },
      });
      setMessage("Kazanan ekrana getirildi.");
    } finally {
      setBusy(false);
    }
  }

  async function removeParticipant(id: string, name: string) {
    if (!confirm(`${name} silinsin mi?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    if (!confirm("TÜM kayıtlar silinsin mi? Geri alınamaz.")) return;
    setBusy(true);
    try {
      await fetch("/api/admin?all=1", {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });
      setMessage("Sıfırlandı.");
    } finally {
      setBusy(false);
    }
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify(password);
          }}
          className="w-full max-w-sm rounded-2xl border border-brand-teal/20 bg-brand-card/60 p-7 backdrop-blur-xl"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-brand-night ring-2 ring-brand-teal/60">
              <Image src="/mascot-face.jpg" alt="" fill sizes="48px" className="object-cover object-top" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-brand-teal">
                Security Day IV
              </p>
              <h1 className="text-xl font-bold text-brand-ice">Admin</h1>
            </div>
          </div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-ice/50">
            Şifre
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-brand-teal/15 bg-brand-night/60 px-4 py-3 text-base text-brand-ice outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/30"
            autoFocus
          />
          {authError && <p className="mt-3 text-sm text-rose-300">{authError}</p>}
          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-brand-teal to-brand-cyan px-4 py-3 font-bold text-brand-night transition hover:brightness-110 active:scale-[0.99]"
          >
            Giriş
          </button>
        </form>
      </main>
    );
  }

  const state = snapshot?.state ?? "idle";
  const stateLabel: Record<string, { text: string; color: string }> = {
    idle: { text: "Hazırlık", color: "text-emerald-300" },
    drawing: { text: "Çark dönüyor", color: "text-amber-300" },
    finished: { text: "Tamamlandı", color: "text-brand-teal" },
  };

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-brand-night ring-2 ring-brand-teal/60">
              <Image src="/mascot-face.jpg" alt="" fill sizes="44px" className="object-cover object-top" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-brand-teal">
                Security Day IV
              </p>
              <h1 className="text-2xl font-bold text-brand-ice">Admin Paneli</h1>
            </div>
          </div>
          <span
            className={`flex items-center gap-2 rounded-full border border-current/20 bg-current/10 px-3 py-1.5 text-xs font-bold ${stateLabel[state].color}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {stateLabel[state].text}
          </span>
        </header>

        <section className="mt-6 rounded-2xl border border-brand-teal/15 bg-brand-card/50 p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-brand-ice/60">
            Kontrol
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={startDraw}
              disabled={busy || state !== "idle" || (snapshot?.participants.length ?? 0) === 0}
              className="rounded-xl bg-gradient-to-r from-brand-teal to-brand-cyan px-5 py-3 text-sm font-bold text-brand-night shadow-glow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-30"
            >
              Çekilişi Başlat
            </button>
            <button
              onClick={revealWinner}
              disabled={busy || state !== "drawing"}
              className="rounded-xl bg-gradient-to-r from-amber-300 to-amber-200 px-5 py-3 text-sm font-bold text-amber-900 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-30"
            >
              Sonucu Göster
            </button>
            <button
              onClick={resetAll}
              disabled={busy}
              className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-5 py-3 text-sm font-bold text-rose-200 transition hover:bg-rose-500/20 active:scale-[0.98] disabled:opacity-30"
            >
              Sıfırla
            </button>
          </div>
          {message && (
            <p className="mt-4 rounded-xl border border-brand-teal/20 bg-brand-teal/5 p-3 text-sm text-brand-ice/80">
              {message}
            </p>
          )}
          {snapshot?.winner && state !== "idle" && (
            <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-amber-100">
              <strong className="font-bold">Kazanan:</strong> {snapshot.winner.name}
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-brand-teal/15 bg-brand-card/50 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-ice/60">
              Katılımcılar
            </h2>
            <span className="rounded-full border border-brand-teal/30 bg-brand-teal/10 px-3 py-0.5 text-sm font-bold text-brand-teal">
              {snapshot?.participants.length ?? 0}
            </span>
          </div>
          {!snapshot || snapshot.participants.length === 0 ? (
            <p className="text-sm text-brand-ice/40">Henüz kayıt yok.</p>
          ) : (
            <ul className="divide-y divide-brand-teal/10">
              {snapshot.participants.map((p, idx) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-ink text-xs font-bold text-brand-ice/50">
                      {idx + 1}
                    </span>
                    <span className="text-brand-ice">{p.name}</span>
                  </span>
                  <button
                    onClick={() => removeParticipant(p.id, p.name)}
                    disabled={busy || state !== "idle"}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-30"
                  >
                    Sil
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
